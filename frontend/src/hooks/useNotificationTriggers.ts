import { useNotifications } from "@/contexts/NotificationContext";

/**
 * Hook to make notification actions easier in components
 */
export function useNotificationTriggers() {
  const { addNotification } = useNotifications();

  return {
    notifyNewMatch: (userName: string) => {
      addNotification({
        type: "match",
        title: "New Match Found! 🎯",
        message: `You matched with ${userName}. Check the matches page to connect.`,
        action: { label: "View", href: "/matches" },
      });
    },

    notifyMatchAccepted: (userName: string) => {
      addNotification({
        type: "match",
        title: "Match Accepted! 🤝",
        message: `${userName} accepted your match request. You can now exchange skills!`,
        action: { label: "View", href: "/matches" },
      });
    },

    notifyRequestResponse: (userName: string, message: string) => {
      addNotification({
        type: "request",
        title: "New Request Response",
        message: `${userName} responded: "${message}"`,
        action: { label: "View", href: "/matches" },
      });
    },

    notifyAchievementUnlocked: (achievementName: string, description: string) => {
      addNotification({
        type: "achievement",
        title: `Achievement Unlocked! 🏅`,
        message: `${achievementName} - ${description}`,
        action: { label: "View Profile", href: "/profile" },
      });
    },

    notifyProfileReminder: () => {
      addNotification({
        type: "profile",
        title: "Complete Your Profile",
        message: "A complete profile helps you find better matches. Add your skills and bio now!",
        action: { label: "Complete", href: "/profile" },
      });
    },

    notifyAIEnhancementCompleted: (field: string) => {
      addNotification({
        type: "ai",
        title: "AI Enhancement Ready ✨",
        message: `Your ${field} has been improved. Review and apply it in your profile.`,
        action: { label: "Review", href: "/profile" },
      });
    },

    notifySystemMessage: (title: string, message: string, action?: { label: string; href: string }) => {
      addNotification({
        type: "system",
        title,
        message,
        action,
      });
    },
  };
}
