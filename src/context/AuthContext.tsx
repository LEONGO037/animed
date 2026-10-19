import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string, currentUser?: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data as UserProfile);
        setRole(data.role as UserRole);
        return;
      }

      // Si no existe perfil en la tabla, verificar metadata de autenticación
      const metaRole = (currentUser?.user_metadata?.role as UserRole) || 'patient';
      setRole(metaRole);
      setProfile({
        id: userId,
        role: metaRole,
        username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'usuario',
        first_name: currentUser?.user_metadata?.first_name || 'Usuario',
        last_name_p: currentUser?.user_metadata?.last_name_p || '',
      });
    } catch (err: any) {
      console.warn('Error al obtener perfil:', err.message);
      setRole('patient');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Obtener sesión activa inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchProfile(initialSession.user.id, initialSession.user).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Suscribirse a cambios de estado de autenticación
    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user);
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (usernameOrEmail: string, password: string) => {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    if (!cleanInput || !password) {
      return { error: 'Por favor ingresa usuario y contraseña.' };
    }

    let email = cleanInput;

    // Si el usuario no ingresó un correo con @, resolvemos su correo según el nombre de usuario
    if (!cleanInput.includes('@')) {
      try {
        console.log('[Auth] Buscando correo para usuario:', cleanInput);

        // Intento 1: Consulta directa a profiles por username
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', cleanInput)
          .maybeSingle();

        if (profileMatch?.email) {
          console.log('[Auth] Correo encontrado en profiles:', profileMatch.email);
          email = profileMatch.email;
        } else {
          // Intento 2: RPC get_email_by_username
          const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
            p_username: cleanInput,
          });

          if (rpcEmail) {
            console.log('[Auth] Correo resuelto por RPC:', rpcEmail);
            email = rpcEmail;
          } else {
            if (rpcError) {
              console.warn('[Auth] Error en RPC get_email_by_username:', rpcError.message);
            }
            if (cleanInput === 'marceloa') {
              email = 'anibarro30@gmail.com';
            } else {
              email = `${cleanInput}@animed.app`;
            }
          }
        }
      } catch (lookupErr: any) {
        console.warn('[Auth] Excepción al resolver correo:', lookupErr.message);
        if (cleanInput === 'marceloa') {
          email = 'anibarro30@gmail.com';
        } else {
          email = `${cleanInput}@animed.app`;
        }
      }
    }

    console.log('[Auth] Intentando signIn con email:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn('[Auth] Error devuelto por Supabase Auth:', error.message);
        if (error.message.includes('Email not confirmed')) {
          return {
            error:
              'La cuenta no ha sido confirmada en Supabase. Si eres el administrador, ejecuta el script fix_login_and_auth.sql en Supabase.',
          };
        }
        if (error.message.includes('Invalid login credentials')) {
          return {
            error:
              'Credenciales inválidas. Revisa tu usuario (o correo) y la contraseña ingresada.',
          };
        }
        return { error: error.message };
      }

      if (data.user) {
        console.log('[Auth] Sesión iniciada con éxito para usuario:', data.user.id);
        await fetchProfile(data.user.id, data.user);
      }

      return {};
    } catch (err: any) {
      console.warn('[Auth] Error inesperado en signIn:', err.message);
      return { error: err.message || 'Error inesperado al conectar.' };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
