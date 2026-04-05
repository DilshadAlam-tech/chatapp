import { User, MessageSquare, Search, Users, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/', icon: Search, label: 'Find' },
  { path: '/teams', icon: Users, label: 'Teams' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActiveTab = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = isActiveTab(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200',
                active ? 'text-primary neon-text scale-110' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
