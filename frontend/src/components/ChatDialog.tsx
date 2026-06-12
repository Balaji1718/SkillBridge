import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { MessageSquare, Send, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | any;
}

export default function ChatDialog({
  open,
  onOpenChange,
  matchId,
  partnerName,
  partnerEmail,
  currentUserId,
  currentUserName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  partnerName: string;
  partnerEmail?: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!open || !matchId) return;

    const messagesRef = collection(db, "matches", matchId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(msgs);
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return unsubscribe;
  }, [open, matchId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      const messagesRef = collection(db, "matches", matchId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        text: inputText.trim(),
        createdAt: serverTimestamp(),
      });
      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (msg: ChatMessage) => {
    if (!msg.createdAt) return "";
    const date = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt.seconds * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[550px] flex flex-col p-0 gap-0 overflow-hidden bg-background border">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-card flex flex-row items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <DialogTitle className="text-base font-heading flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Chat with {partnerName}
            </DialogTitle>
            {partnerEmail && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {partnerEmail}
              </p>
            )}
          </div>
        </DialogHeader>

        {/* Message timeline area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs max-w-[240px]">
                Send a message to coordinate your skills exchange schedule and location!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-muted-foreground px-1 mb-0.5">
                    {isMe ? "You" : msg.senderName}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card text-card-foreground border rounded-tl-none"
                    }`}
                  >
                    <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.createdAt && (
                      <span
                        className={`block text-[9px] text-right mt-1 opacity-70 ${
                          isMe ? "text-primary-foreground/90" : "text-muted-foreground"
                        }`}
                      >
                        {formatMessageTime(msg)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / input form */}
        <form onSubmit={handleSend} className="p-3 border-t bg-card flex gap-2 shrink-0">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full focus-visible:ring-1"
            disabled={sending}
            aria-label="Type message text"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full shrink-0"
            disabled={!inputText.trim() || sending}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
