import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface NotificationPanelProps {
  onClose?: () => void;
}

const typeColors: Record<string, string> = {
  match: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  achievement: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
  request: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  profile: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  ai: "bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800",
  system: "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800",
};

const typeIcons: Record<string, string> = {
  match: "🎯",
  achievement: "🏅",
  request: "📝",
  profile: "👤",
  ai: "✨",
  system: "📢",
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotifications();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-heading font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 hover:bg-secondary/50 transition-colors border-l-4 ${
                  typeColors[notif.type]
                } ${!notif.read ? "bg-secondary/20" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="text-xl">{typeIcons[notif.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="p-1 hover:bg-white/50 dark:hover:bg-black/50 rounded transition-colors shrink-0"
                          aria-label="Mark as read"
                        >
                          <Check className="h-3 w-3 text-primary" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                      </span>
                      {notif.action && (
                        <Link
                          to={notif.action.href}
                          onClick={onClose}
                          className="text-xs text-primary hover:underline"
                        >
                          {notif.action.label}
                        </Link>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => clearNotification(notif.id)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t p-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllNotifications}
            className="w-full text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
