import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'vendedor';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  agencyId: string | null;
  agencyName: string | null;
  role: AppRole | null;
  signUp: (email: string, password: string) => Promise<{ session: Session | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  // Cargar la membresía de agencia del usuario logueado
  const loadAgencyMembership = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('agency_members')
        .select('agency_id, role, agencies(name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error loading agency membership:', error);
        setAgencyId(null);
        setAgencyName(null);
        setRole(null);
        return;
      }

      if (data) {
        setAgencyId(data.agency_id);
        setRole(data.role as AppRole);
        const agencies = data.agencies as { name?: string } | null;
        setAgencyName(agencies?.name ?? null);
      } else {
        setAgencyId(null);
        setAgencyName(null);
        setRole(null);
      }
    } catch (e) {
      console.error('[Auth] Unexpected error loading membership:', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAgencyMembership(session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession((currentSession) => {
          if (currentSession?.access_token !== session?.access_token) {
            return session;
          }
          return currentSession;
        });
        setUser((currentUser) => {
          const newUserId = session?.user?.id ?? null;
          if (currentUser?.id !== newUserId) {
            // Defer the membership lookup to avoid blocking the auth callback
            if (session?.user) {
              setTimeout(() => {
                if (mounted) loadAgencyMembership(session.user.id);
              }, 0);
            } else {
              setAgencyId(null);
              setAgencyName(null);
              setRole(null);
            }
            return session?.user ?? null;
          }
          return currentUser;
        });
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { session: data?.session ?? null, error: error ? new Error(error.message) : null };
    } catch (error) {
      return { session: null, error: error instanceof Error ? error : new Error('Error al registrar') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Error al iniciar sesión') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        agencyId,
        agencyName,
        role,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
