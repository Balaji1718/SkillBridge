export const REQUEST_EXPIRY_DAYS = 30;

export type RequestLifecycleStatus = "active" | "archived" | "completed";

export interface RequestLifecycleRecord {
  status?: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | Date | string | null;
  expiresAt?: { seconds?: number; nanoseconds?: number } | Date | string | null;
  archivedAt?: { seconds?: number; nanoseconds?: number } | Date | string | null;
  completedAt?: { seconds?: number; nanoseconds?: number } | Date | string | null;
  archiveReason?: string;
}

const EXPIRY_MS = REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function toMillis(value: RequestLifecycleRecord[keyof RequestLifecycleRecord]): number | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return null;
}

export function getRequestExpiryMillis(request: RequestLifecycleRecord): number | null {
  const explicitExpiry = toMillis(request.expiresAt);
  if (explicitExpiry !== null) {
    return explicitExpiry;
  }

  const createdAt = toMillis(request.createdAt);
  if (createdAt === null) return null;

  return createdAt + EXPIRY_MS;
}

export function isRequestExpired(request: RequestLifecycleRecord, now = Date.now()): boolean {
  const status = (request.status || "open").toLowerCase();
  if (status !== "open") return false;

  const expiryMillis = getRequestExpiryMillis(request);
  if (expiryMillis === null) return false;

  return now >= expiryMillis;
}

export function getRequestLifecycleStatus(
  request: RequestLifecycleRecord,
  now = Date.now(),
): RequestLifecycleStatus {
  const status = (request.status || "open").toLowerCase();

  if (status === "completed") return "completed";
  if (status === "archived" || status === "closed" || status === "inactive") return "archived";
  if (isRequestExpired(request, now)) return "archived";

  return "active";
}

export function isRequestActive(request: RequestLifecycleRecord, now = Date.now()): boolean {
  return getRequestLifecycleStatus(request, now) === "active";
}

export function shouldAutoArchive(request: RequestLifecycleRecord, now = Date.now()): boolean {
  return (request.status || "open").toLowerCase() === "open" && isRequestExpired(request, now);
}

export function getRequestStatusLabel(request: RequestLifecycleRecord, now = Date.now()): string {
  const lifecycleStatus = getRequestLifecycleStatus(request, now);
  if (lifecycleStatus === "active") return "Active";
  if (lifecycleStatus === "completed") return "Completed";
  return "Archived";
}
