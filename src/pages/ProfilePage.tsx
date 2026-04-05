import { useEffect, useState } from "react";
import {
  Ban,
  Copy,
  Edit2,
  Flag,
  Gamepad2,
  Instagram,
  MessageSquare,
  Save,
  Shield,
  Star,
  X,
  Youtube,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime, formatShortDate, normalizeExternalUrl } from "@/lib/format";
import { GameType, RoleType, blockUser, getUser, reportUser, updateProfile, useStoreSubscription } from "@/lib/store";
import { cn } from "@/lib/utils";

const games: GameType[] = ["Free Fire Max", "BGMI", "Call of Duty"];
const roles: RoleType[] = ["IGL", "Primary Rusher", "Secondary Rusher", "Defender", "Support", "Sniper", "Zone Pusher"];

const gameColors: Record<string, string> = {
  "Free Fire Max": "text-neon-orange",
  BGMI: "text-neon-blue",
  "Call of Duty": "text-neon-red",
};

const inputCls = "w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "mb-1 block text-xs text-muted-foreground";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  useStoreSubscription();

  const isOwnProfile = !id || id === user?.id;
  const profile = isOwnProfile ? user : getUser(id!);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    realName: "",
    contactNumber: "",
    game: "Free Fire Max" as GameType,
    gameUid: "",
    gameName: "",
    level: 1,
    role: "Support" as RoleType,
    instagram: "",
    youtube: "",
  });

  useEffect(() => {
    if (!profile) return;

    setForm({
      username: profile.username,
      realName: profile.realName,
      contactNumber: profile.contactNumber,
      game: profile.game,
      gameUid: profile.gameUid,
      gameName: profile.gameName,
      level: profile.level,
      role: profile.role,
      instagram: profile.instagram || "",
      youtube: profile.youtube || "",
    });
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        User not found
      </div>
    );
  }

  const statCards = [
    { label: "Activity", value: profile.activityScore.toString() },
    { label: "Level", value: profile.level.toString() },
    { label: "Joined", value: formatShortDate(profile.createdAt) },
  ];

  const resetForm = () => {
    setForm({
      username: profile.username,
      realName: profile.realName,
      contactNumber: profile.contactNumber,
      game: profile.game,
      gameUid: profile.gameUid,
      gameName: profile.gameName,
      level: profile.level,
      role: profile.role,
      instagram: profile.instagram || "",
      youtube: profile.youtube || "",
    });
  };

  const handleSave = async () => {
    if (!isOwnProfile || !user) return;

    setSaving(true);
    try {
      const result = await updateProfile(user.id, {
        username: form.username.trim(),
        realName: form.realName.trim(),
        contactNumber: form.contactNumber.trim(),
        game: form.game,
        gameUid: form.gameUid.trim(),
        gameName: form.gameName.trim(),
        level: Number(form.level),
        role: form.role,
        instagram: normalizeExternalUrl(form.instagram),
        youtube: normalizeExternalUrl(form.youtube),
      });

      if (!result.success) {
        toast.error(result.error || "Could not update profile");
        return;
      }

      await refreshUser();
      setEditing(false);
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setEditing(false);
  };

  const handleReport = async () => {
    if (!user || isOwnProfile) return;
    await reportUser(user.id, profile.id, "Reported by user");
    toast.success("User reported");
  };

  const handleBlock = async () => {
    if (!user || isOwnProfile) return;
    await blockUser(user.id, profile.id);
    toast.success("User blocked");
    navigate("/");
  };

  const copyGameUid = async () => {
    try {
      await navigator.clipboard.writeText(profile.gameUid);
      toast.success("Game UID copied");
    } catch {
      toast.error("Could not copy UID");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopBar />

      <div className="mx-auto max-w-lg p-4">
        <div className="glass mb-4 rounded-2xl p-6 text-center animate-slide-up">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-muted font-heading text-xl font-bold text-primary neon-glow">
            {profile.username.slice(0, 2).toUpperCase()}
          </div>

          <div className="mb-1 flex items-center justify-center gap-1.5">
            <h2 className="font-heading text-lg font-bold">{profile.username}</h2>
            {profile.verified && <Shield size={16} className="text-primary" />}
          </div>

          <p className="text-xs text-muted-foreground">{profile.realName}</p>
          <div className={cn("mt-1 flex items-center justify-center gap-1 text-xs", profile.online ? "text-online" : "text-muted-foreground")}>
            <span className={cn("h-2 w-2 rounded-full", profile.online ? "bg-online" : "bg-muted-foreground")} />
            {profile.online ? "Online now" : `Seen ${formatRelativeTime(profile.lastSeen)}`}
          </div>

          {isOwnProfile ? (
            <button
              onClick={() => {
                resetForm();
                setEditing(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted/80"
            >
              <Edit2 size={14} />
              EDIT PROFILE
            </button>
          ) : (
            <button
              onClick={() => navigate(`/chat/${profile.id}`)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-neon-btn px-4 py-2 text-xs font-bold text-primary-foreground neon-glow"
            >
              <MessageSquare size={14} />
              Message Player
            </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {statCards.map((card) => (
            <div key={card.label} className="glass rounded-xl p-3 text-center">
              <p className="font-heading text-sm font-bold text-primary">{card.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>

        {isOwnProfile && editing && (
          <div className="glass mb-4 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-xs font-bold tracking-wider text-muted-foreground">EDIT PROFILE</h3>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Email stays fixed for login</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Username</label>
                  <input
                    className={inputCls}
                    value={form.username}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, username: e.target.value }))}
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className={labelCls}>Real Name</label>
                  <input
                    className={inputCls}
                    value={form.realName}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, realName: e.target.value }))}
                    placeholder="Real name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contact Number</label>
                  <input
                    className={inputCls}
                    value={form.contactNumber}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, contactNumber: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={`${inputCls} opacity-70`} value={profile.email} readOnly />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Game</label>
                  <select
                    className={inputCls}
                    value={form.game}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, game: e.target.value as GameType }))}
                  >
                    {games.map((game) => (
                      <option key={game} value={game}>
                        {game}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <select
                    className={inputCls}
                    value={form.role}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, role: e.target.value as RoleType }))}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Game UID</label>
                  <input
                    className={inputCls}
                    value={form.gameUid}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, gameUid: e.target.value }))}
                    placeholder="Game UID"
                  />
                </div>
                <div>
                  <label className={labelCls}>Game Name</label>
                  <input
                    className={inputCls}
                    value={form.gameName}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, gameName: e.target.value }))}
                    placeholder="In-game name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Level</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={inputCls}
                    value={form.level}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, level: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Instagram</label>
                  <input
                    className={inputCls}
                    value={form.instagram}
                    onChange={(e) => setForm((currentValue) => ({ ...currentValue, instagram: e.target.value }))}
                    placeholder="Instagram username or URL"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>YouTube</label>
                <input
                  className={inputCls}
                  value={form.youtube}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, youtube: e.target.value }))}
                  placeholder="YouTube handle or URL"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg gradient-neon-btn py-2 text-xs font-bold text-primary-foreground"
                >
                  <Save size={12} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-2 text-xs"
                >
                  <X size={12} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass mb-4 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h3 className="mb-3 font-heading text-xs font-bold tracking-wider text-muted-foreground">GAME INFO</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Game</span>
              <p className={cn("font-semibold", gameColors[profile.game])}>
                <Gamepad2 size={13} className="mr-1 inline" />
                {profile.game}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Role</span>
              <p className="font-semibold">{profile.role}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Level</span>
              <p className="font-semibold">
                <Star size={13} className="mr-1 inline text-warning" />
                {profile.level}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Game Name</span>
              <p className="font-semibold">{profile.gameName}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Game UID</span>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xs">{profile.gameUid}</p>
                <button
                  onClick={copyGameUid}
                  className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Contact</span>
              <p className="font-semibold">{profile.contactNumber}</p>
            </div>
          </div>
        </div>

        <div className="glass mb-4 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="mb-3 font-heading text-xs font-bold tracking-wider text-muted-foreground">SOCIAL LINKS</h3>

          <div className="space-y-2">
            {profile.instagram && (
              <a
                href={profile.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-neon-purple hover:underline"
              >
                <Instagram size={14} />
                Instagram
              </a>
            )}
            {profile.youtube && (
              <a
                href={profile.youtube}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-neon-red hover:underline"
              >
                <Youtube size={14} />
                YouTube
              </a>
            )}
            {!profile.instagram && !profile.youtube && <p className="text-xs text-muted-foreground">No social links added yet</p>}
          </div>
        </div>

        {!isOwnProfile && user && (
          <div className="flex gap-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={() => void handleReport()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Flag size={14} />
              Report
            </button>
            <button
              onClick={() => void handleBlock()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban size={14} />
              Block
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
