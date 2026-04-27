"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createUsersRepository } from '@/lib/repositories';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    user_name: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const usersRepo = createUsersRepository(supabase);
        const { data, error } = await usersRepo.getProfile(userId);
        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as UserProfile;
    };

    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            const newUser = session?.user ?? null;
            setUser(newUser);

            if (newUser) {
                const profileData = await fetchProfile(newUser.id);
                if (mounted) setProfile(profileData);
            } else {
                if (mounted) setProfile(null);
            }

            setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            // Clear account-related local storage if relevant
            localStorage.removeItem('lynks_active_account_id');
            router.push('/');
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            isLoading,
            logout
        }}>
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
