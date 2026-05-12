import React from "react";
import { Badge as UiBadge } from "@/components/ui/badge";

type Props = {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  small?: boolean;
};

export default function AchievementBadge({ title, description, icon, earned, small }: Props) {
  return (
    <div className={`flex items-center gap-2 ${small ? "text-xs" : "text-sm"}`} title={description}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${earned ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
        <span>{icon}</span>
      </div>
      <div className="flex flex-col">
        <div className={`font-medium ${small ? "text-xs" : "text-sm"}`}>{title}</div>
        {!small && <div className="text-[11px] text-muted-foreground">{description}</div>}
      </div>
    </div>
  );
}
