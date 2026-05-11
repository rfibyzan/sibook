import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; avatar_url?: string; role?: string }) => Promise<{ error: any }>;
  profile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: { full_name?: string; avatar_url?: string; role?: string }) => {
    if (!user) return { error: 'No active user session' };
    
    const userId = user.id;

    // 1. Update Auth Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: data.full_name, avatar_url: data.avatar_url, role: data.role }
    });

    // 2. Update Public Profile Table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        role: data.role,
        updated_at: new Date().toISOString()
      } as any);

    if (!profileError) fetchProfile(userId);

    return { error: authError || profileError };
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
