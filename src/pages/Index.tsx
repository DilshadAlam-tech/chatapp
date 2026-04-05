import { useAuth } from '@/contexts/AuthContext';
import AuthPage from './AuthPage';
import FindTeamPage from './FindTeamPage';

export default function Index() {
  const { user } = useAuth();
  if (!user) return <AuthPage />;
  return <FindTeamPage />;
}
