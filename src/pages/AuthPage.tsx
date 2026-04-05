import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Gamepad2, Shield, Zap } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { GameType, RoleType, login, signUp } from "@/lib/store";

const games: GameType[] = ["Free Fire Max", "BGMI", "Call of Duty"];
const roles: RoleType[] = ["IGL", "Primary Rusher", "Secondary Rusher", "Defender", "Support", "Sniper", "Zone Pusher"];

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [form, setForm] = useState({
    username: "",
    realName: "",
    email: "",
    password: "",
    contactNumber: "",
    game: "" as GameType,
    gameUid: "",
    gameName: "",
    level: 1,
    role: "" as RoleType,
  });

  const inputCls =
    "w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(loginEmail.trim(), loginPassword);
      if (!result.success || !result.user) {
        setError(result.error || "Login failed");
        return;
      }

      setUser(result.user);
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (
        !form.username ||
        !form.realName ||
        !form.email ||
        !form.password ||
        !form.contactNumber ||
        !form.game ||
        !form.gameUid ||
        !form.gameName ||
        !form.role
      ) {
        setError("All fields are required");
        return;
      }

      if (form.username.trim().length < 4) {
        setError("Username must be at least 4 characters");
        return;
      }

      if (form.password.trim().length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      const result = await signUp({
        ...form,
        username: form.username.trim(),
        realName: form.realName.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        gameUid: form.gameUid.trim(),
        gameName: form.gameName.trim(),
        avatar: "",
      });

      if (!result.success || !result.user) {
        setError(result.error || "Signup failed");
        return;
      }

      setUser(result.user);
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <Gamepad2 className="text-primary" size={32} />
            <h1 className="font-heading text-2xl font-bold tracking-wider text-primary neon-text">SQUAD FINDER</h1>
          </div>
          <p className="text-sm text-muted-foreground">Find serious teammates, manage squads, and keep your scrim chat in one place.</p>
        </div>

        <div className="mb-6 flex rounded-xl bg-muted p-1">
          {(["login", "signup"] as const).map((currentMode) => (
            <button
              key={currentMode}
              onClick={() => {
                setMode(currentMode);
                setError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === currentMode ? "bg-primary text-primary-foreground neon-glow" : "text-muted-foreground"
              }`}
            >
              {currentMode === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <Shield size={14} />
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="your@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  className={`${inputCls} pr-10`}
                  placeholder="********"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((currentValue) => !currentValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl gradient-neon-btn py-3 font-heading text-sm font-bold tracking-wider text-primary-foreground transition-all hover:opacity-90 neon-glow"
            >
              <Zap size={16} />
              {isSubmitting ? "PLEASE WAIT..." : "LOGIN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Username</label>
                <input
                  className={inputCls}
                  placeholder="min 4 chars"
                  value={form.username}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, username: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Real Name</label>
                <input
                  className={inputCls}
                  placeholder="Your name"
                  value={form.realName}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, realName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((currentValue) => ({ ...currentValue, email: e.target.value }))}
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  className={`${inputCls} pr-10`}
                  placeholder="********"
                  value={form.password}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((currentValue) => !currentValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Contact Number</label>
              <input
                className={inputCls}
                placeholder="Phone number"
                value={form.contactNumber}
                onChange={(e) => setForm((currentValue) => ({ ...currentValue, contactNumber: e.target.value }))}
              />
            </div>

            <div>
              <label className={labelCls}>Game</label>
              <select
                className={inputCls}
                value={form.game}
                onChange={(e) => setForm((currentValue) => ({ ...currentValue, game: e.target.value as GameType }))}
              >
                <option value="">Select game</option>
                {games.map((game) => (
                  <option key={game} value={game}>
                    {game}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Game UID</label>
                <input
                  className={inputCls}
                  placeholder="Unique ID"
                  value={form.gameUid}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, gameUid: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Game Name</label>
                <input
                  className={inputCls}
                  placeholder="In-game name"
                  value={form.gameName}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, gameName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Level (1-100)</label>
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
                <label className={labelCls}>Role</label>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) => setForm((currentValue) => ({ ...currentValue, role: e.target.value as RoleType }))}
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl gradient-neon-btn py-3 font-heading text-sm font-bold tracking-wider text-primary-foreground transition-all hover:opacity-90 neon-glow"
            >
              <Zap size={16} />
              {isSubmitting ? "PLEASE WAIT..." : "CREATE ACCOUNT"}
            </button>
          </form>
        )}

        <div className="mt-8 space-y-2 text-center">
          <p className="text-xs text-muted-foreground">Follow us</p>
          <Link to="/privacy" className="block text-xs text-muted-foreground hover:underline">
            Privacy Policy
          </Link>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/sonu_trending_1"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neon-purple hover:underline"
            >
              Instagram
            </a>
            <a
              href="https://youtube.com/@sonu__flexyr7"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neon-red hover:underline"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
