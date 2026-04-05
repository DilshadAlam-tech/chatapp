import { useState } from "react";
import { Ban, Copy, Edit2, Flag, Gamepad2, MessageSquare, Save, Shield, Star, X, Instagram, Youtube } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime, formatShortDate, normalizeExternalUrl } from "@/lib/format";
import { blockUser, getUser, reportUser, updateProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

const gameColors: Record<string, string> = {
  "Free Fire Max": "text-neon-orange",
  BGMI: "text-neon-blue",
  "Call of Duty": "text-neon-red",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const isOwnProfile = !id || id === user?.id;
  const profile = isOwnProfile ? user : getUser(id!);

  const [editing, setEditing] = useState(false);
  const [instagram, setInstagram] = useState(profile?.instagram || "");
  const [youtube, setYoutube] = useState(profile?.youtube || "");

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

  const handleSave = () => {
    if (!isOwnProfile || !user) return;

    updateProfile(user.id, {
      instagram: normalizeExternalUrl(instagram),
      youtube: normalizeExternalUrl(youtube),
    });
    refreshUser();
    setEditing(false);
    toast.success("Profile updated");
  };

  const handleCancel = () => {
    setInstagram(profile.instagram || "");
    setYoutube(profile.youtube || "");
    setEditing(false);
  };

  const handleReport = () => {
    if (!user || isOwnProfile) return;
    reportUser(user.id, profile.id, "Reported by user");
    toast.success("User reported");
  };

  const handleBlock = () => {
    if (!user || isOwnProfile) return;
    blockUser(user.id, profile.id);
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

          {!isOwnProfile && (
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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-xs font-bold tracking-wider text-muted-foreground">SOCIAL LINKS</h3>
            {isOwnProfile && !editing && (
              <button onClick={() => setEditing(true)} className="text-muted-foreground transition-colors hover:text-foreground">
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Instagram size={14} className="text-neon-purple" />
                <input
                  className="flex-1 rounded bg-muted px-2 py-1.5 text-sm text-foreground border border-border"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram username or URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Youtube size={14} className="text-neon-red" />
                <input
                  className="flex-1 rounded bg-muted px-2 py-1.5 text-sm text-foreground border border-border"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="YouTube handle or URL"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg gradient-neon-btn py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <Save size={12} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs"
                >
                  <X size={12} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {!isOwnProfile && user && (
          <div className="flex gap-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={handleReport}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Flag size={14} />
              Report
            </button>
            <button
              onClick={handleBlock}
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
