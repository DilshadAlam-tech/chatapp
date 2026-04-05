import { useEffect, useMemo, useState } from "react";
import { Filter, Search, Users, X } from "lucide-react";
import { toast } from "sonner";

import BottomNav from "@/components/BottomNav";
import PlayerCard from "@/components/PlayerCard";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  GameType,
  RoleType,
  getBlockedUsers,
  getPendingInvite,
  getUserTeams,
  getUsers,
  sendInvite,
} from "@/lib/store";

const games: (GameType | "")[] = ["", "Free Fire Max", "BGMI", "Call of Duty"];
const roles: (RoleType | "")[] = ["", "IGL", "Primary Rusher", "Secondary Rusher", "Defender", "Support", "Sniper", "Zone Pusher"];

export default function FindTeamPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState<GameType | "">("");
  const [roleFilter, setRoleFilter] = useState<RoleType | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const blockedUsers = useMemo(() => (user ? getBlockedUsers(user.id) : []), [user]);
  const leaderTeams = useMemo(
    () => (user ? getUserTeams(user.id).filter((team) => team.leaderId === user.id) : []),
    [user],
  );

  useEffect(() => {
    if (!leaderTeams.length) {
      setSelectedTeamId("");
      return;
    }

    if (!selectedTeamId || !leaderTeams.some((team) => team.teamId === selectedTeamId)) {
      setSelectedTeamId(leaderTeams[0].teamId);
    }
  }, [leaderTeams, selectedTeamId]);

  const activeTeam = leaderTeams.find((team) => team.teamId === selectedTeamId) || leaderTeams[0];

  const players = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return getUsers()
      .filter((player) => {
        if (!user || player.id === user.id || player.flagged || blockedUsers.includes(player.id)) return false;
        if (gameFilter && player.game !== gameFilter) return false;
        if (roleFilter && player.role !== roleFilter) return false;
        if (onlineOnly && !player.online) return false;

        if (!normalizedSearch) return true;

        return [player.username, player.gameName, player.role, player.game]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((firstPlayer, secondPlayer) => {
        if (firstPlayer.online !== secondPlayer.online) return Number(secondPlayer.online) - Number(firstPlayer.online);
        if (firstPlayer.verified !== secondPlayer.verified) return Number(secondPlayer.verified) - Number(firstPlayer.verified);
        return secondPlayer.activityScore - firstPlayer.activityScore;
      });
  }, [blockedUsers, gameFilter, onlineOnly, roleFilter, search, user]);

  const stats = useMemo(
    () => [
      { label: "Players", value: players.length },
      { label: "Online", value: players.filter((player) => player.online).length },
      { label: "Verified", value: players.filter((player) => player.verified).length },
    ],
    [players],
  );

  const getInviteMeta = (playerId: string) => {
    if (!activeTeam) return { disabled: false, label: "Invite" };
    if (activeTeam.members.includes(playerId)) return { disabled: true, label: "Teammate" };
    if (activeTeam.members.length >= activeTeam.maxMembers) return { disabled: true, label: "Full" };
    if (getPendingInvite(activeTeam.teamId, playerId)) return { disabled: true, label: "Pending" };
    return { disabled: false, label: "Invite" };
  };

  const handleInvite = (playerId: string) => {
    if (!user) return;
    if (!activeTeam) {
      toast.error("Create a team first to start inviting players");
      return;
    }

    const inviteMeta = getInviteMeta(playerId);
    if (inviteMeta.disabled) {
      toast.error(`Cannot send invite: ${inviteMeta.label.toLowerCase()}`);
      return;
    }

    const result = sendInvite(activeTeam.teamId, user.id, playerId);
    if (result.success) {
      toast.success(`Invite sent from ${activeTeam.teamName}`);
      return;
    }

    toast.error(result.error);
  };

  const selectCls =
    "flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Find Players</h2>
            <p className="text-xs text-muted-foreground">Search by role, game, status, and activity.</p>
          </div>
          <button onClick={() => setShowFilters((currentValue) => !currentValue)} className="rounded-lg bg-muted p-2 text-foreground">
            {showFilters ? <X size={16} /> : <Filter size={16} />}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-3 text-center">
              <p className="font-heading text-lg font-bold text-primary">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="glass mb-4 rounded-2xl p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <Search size={15} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search players, roles, or in-game names"
            />
          </div>

          {leaderTeams.length > 0 ? (
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Invite as</label>
              <select
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
              >
                {leaderTeams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName} ({team.members.length}/{team.maxMembers})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
              Create a team first to unlock invites and squad management.
            </div>
          )}

          {showFilters && (
            <div className="mt-3 space-y-2 animate-slide-up">
              <div className="flex gap-2">
                <select className={selectCls} value={gameFilter} onChange={(e) => setGameFilter(e.target.value as GameType | "")}>
                  <option value="">All Games</option>
                  {games.filter(Boolean).map((game) => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
                <select className={selectCls} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleType | "")}>
                  <option value="">All Roles</option>
                  {roles.filter(Boolean).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setOnlineOnly((currentValue) => !currentValue)}
                className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  onlineOnly ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {onlineOnly ? "Showing online players only" : "Show only online players"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {players.length === 0 ? (
            <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground">No players match these filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or searching another role.</p>
            </div>
          ) : (
            players.map((player) => {
              const inviteMeta = getInviteMeta(player.id);
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onInvite={() => handleInvite(player.id)}
                  inviteDisabled={inviteMeta.disabled}
                  inviteLabel={inviteMeta.label}
                />
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
