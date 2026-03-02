import { useAuth } from '@/context/AuthContext';

const ADMIN_EMAIL = 'ralucapiteiu@gmail.com';

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.email === ADMIN_EMAIL;
}
