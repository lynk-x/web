/**
 * AuthContext — global authentication state for authenticated routes.
 *
 * Provides the Supabase user, their profile, and a logout function.
 * Consumed by dashboard, onboarding, and setup-profile pages via
 * the shared (protected) layout.
 *
 * Design decisions:
 *   - Module-level singleton for createClient() to match Supabase SSR docs
 *     and avoid unstable references in hooks.
 *   - `isProfileComplete` is derived here so all guards can use it as
 *     a single source of truth instead of reimplementing the check.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createUsersRepository } from '@/lib/repositories';
import { pushNotificationService } from '@/lib/services/push-notification-service';
import type { User } from '@supabase/supabase-js';

/** Module-level singleton — one client per browser tab. */
const supabase = createClient();

interface UserProfile {
    id: string;
    email: string;
    user_name: string;
    full_name: string | null;
    avatar_url: string | null;
    active_account_id?: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isLoadingProfile: boolean;
    /** True when the profile has at least a full_name set. */
    isProfileComplete: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const loadProfile = React.useCallback(async (userId: string, isMounted: () => boolean) => {
        setIsLoadingProfile(true);
        try {
            const usersRepo = createUsersRepository(supabase);
            const { data, error } = await usersRepo.getProfile(userId);
            if (error) {
                console.error('[AuthContext] Error fetching profile:', error);
            } else if (isMounted()) {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error('[AuthContext] Uncaught error fetching profile:', err);
        } finally {
            if (isMounted()) {
                setIsLoadingProfile(false);
            }
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        // Safety valve: unblock loading spinners after 4s if auth or profile state hangs
        const timeout = setTimeout(() => {
            if (mounted) {
                setIsLoading(false);
                setIsLoadingProfile(false);
            }
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            clearTimeout(timeout);
            const newUser = session?.user ?? null;
            setUser(newUser);
            setIsLoading(false);

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (newUser) {
                    loadProfile(newUser.id, () => mounted);
                } else {
                    setProfile(null);
                    setIsLoadingProfile(false);
                }
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setIsLoadingProfile(false);
                pushNotificationService.removeToken().catch((error) => {
                    console.error('[AuthContext] Push removal failed:', error);
                });
            } else if (newUser) {
                loadProfile(newUser.id, () => mounted);
            } else {
                setProfile(null);
                setIsLoadingProfile(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    // Initialize Web Push notifications exclusively when an authenticated user is on a dashboard route.
    // This prevents public discovery and checkout pages from triggering native browser notification permission prompts.
    useEffect(() => {
        if (user && pathname.startsWith('/dashboard')) {
            pushNotificationService.init().catch((error) => {
                console.error('[AuthContext] Push init failed:', error);
            });
        }
    }, [pathname, user]);

    // Sync auth session on routing to protected pages to resolve server-action redirect mismatches
    useEffect(() => {
        let mounted = true;
        const checkSession = async () => {
            if (!user) {
                setIsLoading(true);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!mounted) return;
                    if (session?.user) {
                        setUser(session.user);
                        await loadProfile(session.user.id, () => mounted);
                    }
                } catch (err) {
                    console.error('[AuthContext] Error checking session:', err);
                } finally {
                    if (mounted) {
                        setIsLoading(false);
                        setIsLoadingProfile(false);
                    }
                }
            }
        };

        const protectedRoutes = ['/dashboard', '/onboarding', '/setup-profile'];
        const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
        if (isProtectedRoute && !user) {
            checkSession();
        }

        return () => {
            mounted = false;
        };
    }, [pathname, user, loadProfile]);

    /** Derived: true when the user has completed their profile setup. */
    const isProfileComplete = Boolean(profile?.full_name?.trim());

    const logout = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
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
            isLoadingProfile,
            isProfileComplete,
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
