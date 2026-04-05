import { useAuth } from "@/contexts/AuthContext";

import AuthPage from "./AuthPage";
import FindTeamPage from "./FindTeamPage";

export default function Index() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <FindTeamPage />;
}
