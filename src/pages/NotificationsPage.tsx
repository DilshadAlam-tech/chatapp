import { useEffect } from "react";
import { ArrowLeft, Bell, CheckCircle, MessageSquare, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { clearNotifications, getUserNotifications, markNotificationsRead, useStoreSubscription } from "@/lib/store";
import { cn } from "@/lib/utils";

const typeIcons = {
  chat: MessageSquare,
  invite: Users,
  invite_response: CheckCircle,
  system: Bell,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useStoreSubscription();

  useEffect(() => {
    if (!user) return;

    void markNotificationsRead(user.id);
  }, [user]);

  if (!user) return null;

  const notifications = getUserNotifications(user.id);

  const openNotification = (type: keyof typeof typeIcons, relatedId?: string) => {
    if (type === "chat" && relatedId) {
      navigate(`/chat/${relatedId}`);
      return;
    }

    if (type === "invite" || type === "invite_response") {
      navigate("/teams");
      return;
    }

    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <button onClick={() => navigate(-1)} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
              Back
            </button>
            <h2 className="font-heading text-lg font-bold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Chat alerts, invite responses, and important system updates.</p>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={() => {
                void clearNotifications(user.id);
              }}
              className="rounded-lg border border-border bg-muted p-2 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="glass rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">You are all caught up for now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;

              return (
                <button
                  key={notification.id}
                  onClick={() => openNotification(notification.type, notification.relatedId)}
                  className={cn(
                    "glass flex w-full items-start gap-3 rounded-xl p-3 text-left animate-slide-up transition-colors hover:border-primary/30",
                    !notification.seen && "border border-primary/20",
                  )}
                >
                  <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
