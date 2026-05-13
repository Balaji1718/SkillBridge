export type TimestampLike =
  | { seconds?: number; nanoseconds?: number }
  | Date
  | string
  | null
  | undefined;

export interface MatchHistoryRecord {
  id: string;
  userA?: string;
  userB?: string;
  userAName?: string;
  userBName?: string;
  requestA?: string;
  requestB?: string;
  skillA?: string;
  skillB?: string;
  status?: string;
  createdAt?: TimestampLike;
  completedAt?: TimestampLike;
  completedBy?: string;
}

export interface SessionHistoryEntry {
  key: string;
  matchId: string;
  partnerId: string;
  partnerName: string;
  offeredSkill: string;
  learnedSkill: string;
  matchStatus: string;
  completedAtMillis: number;
  completedAtLabel: string;
  relativeTimeLabel: string;
  ratingSummary?: number;
  milestoneIndex: number;
}

function toMillis(value: TimestampLike): number | null {
  if (!value) return null;

  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return null;
}

export function getSessionHistoryDedupKey(record: MatchHistoryRecord): string {
  const userIds = [record.userA || "", record.userB || ""].sort().join("|");
  const requestIds = [record.requestA || "", record.requestB || ""].sort().join("|");
  return `${userIds}::${requestIds}`;
}

export function getSessionHistoryCompletedMillis(record: MatchHistoryRecord): number {
  return toMillis(record.completedAt) ?? toMillis(record.createdAt) ?? 0;
}

export function buildSessionHistoryEntry(
  record: MatchHistoryRecord,
  currentUserId: string,
  partnerNameFallback?: string,
  ratingSummary?: number,
  milestoneIndex = 0,
): SessionHistoryEntry | null {
  const status = (record.status || "").toLowerCase();
  if (status !== "completed") return null;

  const isUserA = record.userA === currentUserId;
  const isUserB = record.userB === currentUserId;
  if (!isUserA && !isUserB) return null;

  const partnerId = isUserA ? record.userB : record.userA;
  if (!partnerId) return null;

  const completedAtMillis = getSessionHistoryCompletedMillis(record);
  const completedAtDate = new Date(completedAtMillis || Date.now());

  return {
    key: getSessionHistoryDedupKey(record),
    matchId: record.id,
    partnerId,
    partnerName: isUserA ? record.userBName || partnerNameFallback || "Exchange partner" : record.userAName || partnerNameFallback || "Exchange partner",
    offeredSkill: isUserA ? record.skillA || "" : record.skillB || "",
    learnedSkill: isUserA ? record.skillB || "" : record.skillA || "",
    matchStatus: record.status || "completed",
    completedAtMillis,
    completedAtLabel: completedAtDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    relativeTimeLabel: completedAtMillis ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round((completedAtMillis - Date.now()) / (1000 * 60 * 60 * 24)), "day") : "just now",
    ratingSummary,
    milestoneIndex,
  };
}
