import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  auth_id: string;
  enrollment_id: string | null;
  full_name: string;
  email: string;
  branch_id: string | null;
  semester: number | null;
  karma_points: number;
  role: 'STUDENT' | 'SUPER_ADMIN';
  is_verified: boolean;
  is_banned: boolean;
  onboarding_completed: boolean;
  avatar_url: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  fetchProfile: (authId: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });
  const mountedRef = useRef(true);

  const fetchProfile = useCallback(async (authId: string): Promise<UserProfile | null> => {
    let { data, error } = await supabase
      .from('users')
      .select('id, auth_id, enrollment_id, full_name, email, branch_id, semester, karma_points, role, is_verified, is_banned, onboarding_completed, avatar_url')
      .eq('auth_id', authId)
      .maybeSingle();

    if (error && (error.message?.includes('avatar_url') || error.code === '42703')) {
      const fallback = await supabase
        .from('users')
        .select('id, auth_id, enrollment_id, full_name, email, branch_id, semester, karma_points, role, is_verified, is_banned, onboarding_completed')
        .eq('auth_id', authId)
        .maybeSingle();
      data = { ...fallback.data, avatar_url: null } as typeof data;
      error = fallback.error;
    }

    if (error) return null;
    if (!data) return null;
    const fresh = { ...data, avatar_url: (data as Record<string, unknown>).avatar_url ?? null } as UserProfile;
    if (mountedRef.current) {
      setState(prev => (prev.user ? { ...prev, profile: fresh } : prev));
    }
    return fresh;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleMissingProfile = async (session: Session) => {
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 500 + i * 300));
        const retry = await fetchProfile(session.user.id);
        if (retry) return retry;
      }
      return null;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        let profile = await fetchProfile(session.user.id);
        if (!profile) {
          profile = await handleMissingProfile(session);
        }
        setState({ session, user: session.user, profile, loading: false });
      } else {
        setState({ session: null, user: null, profile: null, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        let profile = await fetchProfile(session.user.id);
        if (!profile) {
          profile = await handleMissingProfile(session);
        }
        setState({ session, user: session.user, profile, loading: false });
      } else {
        setState({ session: null, user: null, profile: null, loading: false });
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
