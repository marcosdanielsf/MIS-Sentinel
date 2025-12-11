'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    username?: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const mappedUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
                    role: session.user.user_metadata?.role || 'user',
                };
                setUser(mappedUser);
                setToken(session.access_token);
            } else {
                setUser(null);
                setToken(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const mappedUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
                    role: session.user.user_metadata?.role || 'user',
                };
                setUser(mappedUser);
                setToken(session.access_token);
            }
        } catch (error) {
            console.error('Failed to check user:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const mappedUser: User = {
                    id: data.user.id,
                    email: data.user.email || '',
                    username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
                    role: data.user.user_metadata?.role || 'user',
                };
                setUser(mappedUser);
                setToken(data.session?.access_token || null);
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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