import { Eye, Flame, Gamepad2, MessageSquare, Shield, Star, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { UserProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

const gameColors: Record<string, string> = {
  "Free Fire Max": "text-neon-orange",
  BGMI: "text-neon-blue",
  "Call of Duty": "text-neon-red",
};

interface PlayerCardProps {
  player: UserProfile;
  onInvite?: () => void;
  inviteDisabled?: boolean;
  inviteLabel?: string;
}

export default function PlayerCard({
  player,
  onInvite,
  inviteDisabled = false,
  inviteLabel = "Invite",
}: PlayerCardProps) {
  const navigate = useNavigate();

  return (
    <div className="glass group rounded-xl p-4 transition-all duration-300 hover:border-primary/30 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted font-heading text-sm font-bold text-primary">
            {player.username.slice(0, 2).toUpperCase()}
          </div>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
              player.online ? "bg-online" : "bg-muted-foreground",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{player.username}</span>
            {player.verified && <Shield size={14} className="shrink-0 text-primary" />}
          </div>

          <div className={cn("mt-0.5 flex items-center gap-1 text-xs", gameColors[player.game] || "text-muted-foreground")}>
            <Gamepad2 size={12} />
            <span>{player.game}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star size={11} />
              Lv.{player.level}
            </span>
            <span>{player.role}</span>
            <span className="flex items-center gap-0.5 text-primary/90">
              <Flame size={11} />
              {player.activityScore}
            </span>
          </div>

          <p className="mt-1 truncate text-[11px] text-muted-foreground">{player.gameName}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => navigate(`/player/${player.id}`)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
        >
          <Eye size={13} />
          View
        </button>

        <button
          onClick={() => navigate(`/chat/${player.id}`)}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs font-medium transition-colors hover:bg-muted/80"
        >
          <MessageSquare size={13} />
          Chat
        </button>

        {onInvite && (
          <button
            onClick={onInvite}
            disabled={inviteDisabled}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all",
              inviteDisabled
                ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                : "gradient-neon-btn text-primary-foreground hover:opacity-90 neon-glow",
            )}
          >
            <UserPlus size={13} />
            {inviteLabel}
          </button>
        )}
      </div>
    </div>
  );
}
