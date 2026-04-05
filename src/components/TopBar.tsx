import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { getUnreadCount, useStoreSubscription } from "@/lib/store";

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useStoreSubscription();
  const unread = user ? getUnreadCount(user.id) : 0;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-sm font-bold text-primary neon-text tracking-wider">SQUAD FINDER</h1>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <>
              <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                Hey, <span className="text-foreground font-medium">{user.username}</span>
              </span>
              <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-full hover:bg-muted transition-colors">
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <button onClick={() => void handleLogout()} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
