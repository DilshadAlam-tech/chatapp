import { useState } from "react";
import { Check, Crown, Gamepad2, LogOut, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/format";
import {
  GameType,
  createTeam,
  deleteTeam,
  getOpenTeams,
  getPendingInvitesForLeader,
  getTeam,
  getUser,
  getUserInvites,
  getUserTeams,
  joinTeam,
  leaveTeam,
  respondInvite,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const games: GameType[] = ["Free Fire Max", "BGMI", "Call of Duty"];

export default function TeamsPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState<GameType>("Free Fire Max");
  const [maxMembers, setMaxMembers] = useState(4);
  const [description, setDescription] = useState("");
  const [, setRefreshKey] = useState(0);

  if (!user) return null;

  const myTeams = getUserTeams(user.id);
  const captainTeams = myTeams.filter((team) => team.leaderId === user.id);
  const invites = getUserInvites(user.id);
  const pendingSentInvites = getPendingInvitesForLeader(user.id);
  const openTeams = getOpenTeams(user.id);

  const summaryCards = [
    { label: "Captain", value: captainTeams.length },
    { label: "Joined", value: myTeams.length },
    { label: "Incoming", value: invites.length },
    { label: "Sent", value: pendingSentInvites.length },
  ];

  const refresh = () => setRefreshKey((currentValue) => currentValue + 1);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    createTeam({
      teamName: name.trim(),
      game,
      leaderId: user.id,
      members: [user.id],
      maxMembers,
      description: description.trim(),
    });

    setShowCreate(false);
    setName("");
    setDescription("");
    refresh();
    toast.success("Team created");
  };

  const handleRespond = (inviteId: string, status: "accepted" | "rejected") => {
    respondInvite(inviteId, status);
    refresh();
    toast.success(status === "accepted" ? "Joined team" : "Invite rejected");
  };

  const handleJoinOpenTeam = (teamId: string) => {
    const result = joinTeam(teamId, user.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    refresh();
    toast.success("Joined squad");
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <div className="mb-4">
          <h2 className="font-heading text-lg font-bold">Team Hub</h2>
          <p className="text-xs text-muted-foreground">Manage your squads, incoming invites, and open rosters.</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {summaryCards.map((card) => (
            <div key={card.label} className="glass rounded-xl p-3 text-center">
              <p className="font-heading text-lg font-bold text-primary">{card.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>

        {invites.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-warning">PENDING INVITES</h3>
            <div className="space-y-2">
              {invites.map((invite) => {
                const team = getTeam(invite.teamId);
                const sender = getUser(invite.senderId);

                return (
                  <div key={invite.inviteId} className="glass animate-slide-up rounded-xl border border-warning/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{team?.teamName || "Unknown Team"}</p>
                        <p className="text-xs text-muted-foreground">From {sender?.username || "Unknown"} · {team?.game || "Unknown game"}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRespond(invite.inviteId, "accepted")}
                          className="rounded-lg bg-success/20 p-2 text-success hover:bg-success/30"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRespond(invite.inviteId, "rejected")}
                          className="rounded-lg bg-destructive/20 p-2 text-destructive hover:bg-destructive/30"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pendingSentInvites.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-primary">SENT INVITES</h3>
            <div className="space-y-2">
              {pendingSentInvites.map((invite) => {
                const team = getTeam(invite.teamId);
                const receiver = getUser(invite.receiverId);

                return (
                  <div key={invite.inviteId} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{receiver?.username || "Unknown player"}</p>
                        <p className="text-xs text-muted-foreground">
                          {team?.teamName || "Unknown team"} · sent {formatRelativeTime(invite.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Pending
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground">MY TEAMS</h3>

          {myTeams.length === 0 ? (
            <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground">No teams yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a team or join an open squad below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTeams.map((team) => {
                const isLeader = team.leaderId === user.id;

                return (
                  <div key={team.teamId} className="glass animate-slide-up rounded-xl p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold">{team.teamName}</h3>
                          {isLeader && <Crown size={13} className="text-warning" />}
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Gamepad2 size={11} />
                          {team.game}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {team.members.length}/{team.maxMembers}
                      </span>
                    </div>

                    {team.description && <p className="mb-2 text-xs text-muted-foreground">{team.description}</p>}

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {team.members.map((memberId) => {
                        const member = getUser(memberId);
                        return (
                          <span
                            key={memberId}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              memberId === team.leaderId ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {member?.username || memberId}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      {isLeader ? (
                        <button
                          onClick={() => {
                            deleteTeam(team.teamId);
                            refresh();
                            toast.success("Team deleted");
                          }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-destructive/10 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            leaveTeam(team.teamId, user.id);
                            refresh();
                            toast.success("Left team");
                          }}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut size={12} />
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {openTeams.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground">OPEN SQUADS</h3>
            <div className="space-y-2">
              {openTeams.map((team) => {
                const leader = getUser(team.leaderId);

                return (
                  <div key={team.teamId} className="glass rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{team.teamName}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.game} · by {leader?.username || "Unknown"}
                        </p>
                        {team.description && <p className="mt-1 text-xs text-muted-foreground">{team.description}</p>}
                      </div>
                      <button
                        onClick={() => handleJoinOpenTeam(team.teamId)}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {showCreate && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 sm:items-center"
            onClick={() => setShowCreate(false)}
          >
            <div className="glass w-full max-w-sm rounded-2xl p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 font-heading text-sm font-bold">Create Team</h3>

              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  className={inputCls}
                  placeholder="Team name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <select className={inputCls} value={game} onChange={(e) => setGame(e.target.value as GameType)}>
                  {games.map((currentGame) => (
                    <option key={currentGame} value={currentGame}>
                      {currentGame}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Max members</label>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    className={`${inputCls} w-20`}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                  />
                </div>

                <textarea
                  className={`${inputCls} h-16 resize-none`}
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <button className="w-full rounded-xl gradient-neon-btn py-2.5 font-heading text-sm font-bold text-primary-foreground neon-glow">
                  CREATE
                </button>
              </form>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-neon-btn text-primary-foreground shadow-lg transition-transform hover:scale-105 neon-glow"
        >
          <Plus size={24} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
