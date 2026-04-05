import { useState } from "react";
import { Flame, Medal, Star, Trophy } from "lucide-react";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { GameType, getUsers, useStoreSubscription } from "@/lib/store";
import { cn } from "@/lib/utils";

const gameOptions: Array<GameType | "All"> = ["All", "Free Fire Max", "BGMI", "Call of Duty"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  useStoreSubscription();
  const [activeGame, setActiveGame] = useState<GameType | "All">("All");

  const players = getUsers()
    .filter((player) => !player.flagged)
    .filter((player) => activeGame === "All" || player.game === activeGame)
    .sort((firstPlayer, secondPlayer) => {
      const firstScore = firstPlayer.level * 10 + firstPlayer.activityScore;
      const secondScore = secondPlayer.level * 10 + secondPlayer.activityScore;
      return secondScore - firstScore;
    });

  const rankIcons = [
    <Trophy key={0} size={18} className="text-warning" />,
    <Medal key={1} size={18} className="text-muted-foreground" />,
    <Medal key={2} size={18} className="text-neon-orange" />,
  ];

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
          <Trophy size={20} className="text-warning" />
          Leaderboard
        </h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {gameOptions.map((game) => (
            <button
              key={game}
              onClick={() => setActiveGame(game)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeGame === game ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground",
              )}
            >
              {game}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {players.map((player, index) => {
            const isCurrentUser = player.id === user?.id;

            return (
              <div
                key={player.id}
                className={cn(
                  "glass animate-slide-up flex items-center gap-3 rounded-xl p-3",
                  index === 0 && "border border-warning/30 neon-glow",
                  isCurrentUser && "border border-primary/30",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-8 text-center">
                  {index < 3 ? rankIcons[index] : <span className="font-heading text-sm text-muted-foreground">{index + 1}</span>}
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted font-heading text-xs font-bold text-primary">
                  {player.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {player.username}
                    {isCurrentUser && <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">You</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{player.game} - {player.role}</p>
                </div>

                <div className="text-right">
                  <p className="flex items-center gap-0.5 text-sm font-bold text-primary">
                    <Star size={12} />
                    {player.level}
                  </p>
                  <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Flame size={10} />
                    {player.activityScore}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
