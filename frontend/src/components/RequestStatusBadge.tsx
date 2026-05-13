import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRequestLifecycleStatus, getRequestStatusLabel, type RequestLifecycleRecord } from "@/lib/requestStatus";

export default function RequestStatusBadge({
  request,
  className = "",
}: {
  request: RequestLifecycleRecord;
  className?: string;
}) {
  const lifecycleStatus = getRequestLifecycleStatus(request);

  const styles = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    archived: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    completed: "border-primary/20 bg-primary/10 text-primary",
  } as const;

  return (
    <Badge variant="outline" className={cn("rounded-full text-[10px] uppercase tracking-wide", styles[lifecycleStatus], className)}>
      {getRequestStatusLabel(request)}
    </Badge>
  );
}