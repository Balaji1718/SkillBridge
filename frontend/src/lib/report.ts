import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ReportTargetType = "user" | "request" | "match";

export interface ReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  reporterId?: string | null;
}

// lightweight: check for duplicate recent reports from same reporter (24h window)
export async function submitReport(payload: ReportPayload) {
  try {
    const { targetType, targetId, reason, description, reporterId } = payload;

    if (reporterId) {
      const q = query(
        collection(db, "reports"),
        where("reporterId", "==", reporterId),
        where("targetType", "==", targetType),
        where("targetId", "==", targetId),
        where("reason", "==", reason),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // duplicate report found
        return { ok: false, reason: "duplicate" };
      }
    }

    // add a minimal report document; keep reporterId optional
    await addDoc(collection(db, "reports"), {
      targetType,
      targetId,
      reason,
      description: description || "",
      reporterId: reporterId || null,
      createdAt: serverTimestamp(),
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err };
  }
}
