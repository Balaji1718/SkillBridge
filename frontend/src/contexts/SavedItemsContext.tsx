import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SavedItemType = "profile" | "request" | "match";

export interface SavedItem {
  id: string; // unique identifier (itemId-type)
  type: SavedItemType;
  itemId: string; // userId, requestId, or matchId
  title: string;
  category?: string; // skill name or category
  timestamp: number; // milliseconds
  compatibilityScore?: number;
}

interface SavedItemsContextType {
  savedItems: SavedItem[];
  loading: boolean;
  isSaved: (itemId: string, type: SavedItemType) => boolean;
  saveItem: (itemId: string, type: SavedItemType, title: string, category?: string, compatibilityScore?: number) => Promise<void>;
  unsaveItem: (itemId: string, type: SavedItemType) => Promise<void>;
  savedCount: number;
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined);

export function SavedItemsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved items from user document
  useEffect(() => {
    if (!user) {
      setSavedItems([]);
      setLoading(false);
      return;
    }

    // Real-time listener for user document
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const userData = snap.data();
        const items = (userData?.saved || []) as SavedItem[];
        
        // Sort by timestamp newest first
        items.sort((a, b) => b.timestamp - a.timestamp);
        setSavedItems(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to saved items:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const isSaved = (itemId: string, type: SavedItemType) => {
    return savedItems.some((item) => item.itemId === itemId && item.type === type);
  };

  const saveItem = async (
    itemId: string,
    type: SavedItemType,
    title: string,
    category?: string,
    compatibilityScore?: number
  ) => {
    if (!user) throw new Error("Not authenticated");

    // Prevent duplicates
    if (isSaved(itemId, type)) {
      console.warn(`Item ${itemId} of type ${type} is already saved`);
      return;
    }

    try {
      const newItem: SavedItem = {
        id: `${itemId}-${type}`,
        type,
        itemId,
        title,
        timestamp: Date.now(),
      };

      // Only add optional fields if they have values
      if (category) newItem.category = category;
      if (compatibilityScore !== undefined && compatibilityScore !== null) {
        newItem.compatibilityScore = compatibilityScore;
      }

      await updateDoc(doc(db, "users", user.uid), {
        saved: arrayUnion(newItem),
      });
    } catch (err) {
      console.error("Error saving item:", err);
      throw err;
    }
  };

  const unsaveItem = async (itemId: string, type: SavedItemType) => {
    if (!user) throw new Error("Not authenticated");

    try {
      const itemToRemove = savedItems.find((s) => s.itemId === itemId && s.type === type);
      if (itemToRemove) {
        await updateDoc(doc(db, "users", user.uid), {
          saved: arrayRemove(itemToRemove),
        });
      }
    } catch (err) {
      console.error("Error unsaving item:", err);
      throw err;
    }
  };

  return (
    <SavedItemsContext.Provider
      value={{
        savedItems,
        loading,
        isSaved,
        saveItem,
        unsaveItem,
        savedCount: savedItems.length,
      }}
    >
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext);
  if (!context) {
    throw new Error("useSavedItems must be used within SavedItemsProvider");
  }
  return context;
}
