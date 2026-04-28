/**
 * OrganizationContext — manages the user's account memberships and active workspace.
 *
 * Provides the list of accounts the user belongs to, the currently active account,
 * and a function to switch between them. Active account ID is persisted in
 * localStorage to survive page reloads.
 *
 * Design decisions:
 *   - Uses the same module-level Supabase client singleton as AuthContext
 *     to ensure cookie/auth state is always in sync.
 *   - Business accounts (organizer, advertiser, platform) are preferred
 *     over attendee accounts when selecting a default active workspace.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createAccountsRepository } from '@/lib/repositories';
import { useAuth } from '@/context/AuthContext';

/** Module-level singleton — shared with AuthContext. */
const supabase = createClient();

export interface Account {
    id: string;
    slug?: string;
    name: string;
    /** Extracted from accounts.media->>'logo' */
    logoUrl?: string;
    role: 'owner' | 'admin' | 'accountant' | 'editor' | 'staff' | 'reviewer' | 'moderator' | 'support_agent' | string;
    type: 'attendee' | 'organizer' | 'advertiser' | 'platform';
    wallet_balance?: number;
    wallet_currency?: string;
    payout_routing?: {
        [key: string]: any;
    };
    isPrimary: boolean;
}


interface OrganizationContextType {
    accounts: Account[];
    activeAccount: Account | null;
    setActiveAccountId: (id: string) => void;
    isLoading: boolean;
    refreshAccounts: () => Promise<Account[]>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoading: isLoadingAuth } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setStoredActiveAccountId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAccounts = React.useCallback(async (): Promise<Account[]> => {
        if (!user) {
            setAccounts([]);
            setStoredActiveAccountId(null);
            setIsLoading(false);
            return [];
        }

        setIsLoading(true);
        try {
            const accountsRepo = createAccountsRepository(supabase);
            const { data: memberships, error } = await accountsRepo.getMembershipsForUser(user.id);

            if (error) {
                console.error("[OrganizationContext] Error fetching accounts:", error);
                setAccounts([]);
                setStoredActiveAccountId(null);
                return [];
            }

            if (memberships && memberships.length > 0) {
                setAccounts(memberships);

                const savedId = localStorage.getItem('lynks_active_account_id');
                const businessAccounts = memberships.filter(a => a.type !== 'attendee');
                const fallbackAccounts = businessAccounts.length > 0 ? businessAccounts : memberships;
                
                const isValidSavedId = savedId && fallbackAccounts.some(a => a.id === savedId);
                const primaryAccount = fallbackAccounts.find(a => a.isPrimary);

                if (isValidSavedId) {
                    setStoredActiveAccountId(savedId);
                } else if (primaryAccount) {
                    setStoredActiveAccountId(primaryAccount.id);
                    localStorage.setItem('lynks_active_account_id', primaryAccount.id);
                } else {
                    setStoredActiveAccountId(fallbackAccounts[0].id);
                    localStorage.setItem('lynks_active_account_id', fallbackAccounts[0].id);
                }
                return memberships;
            } else {
                setAccounts([]);
                setStoredActiveAccountId(null);
                return [];
            }
        } catch (err) {
            console.error("[OrganizationContext] Uncaught error fetching accounts:", err);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!isLoadingAuth) {
            fetchAccounts();
        }
    }, [isLoadingAuth, fetchAccounts]);

    const setActiveAccountId = (idOrSlug: string) => {
        const targetAccount = accounts.find(a => a.id === idOrSlug || a.slug === idOrSlug);
        if (targetAccount) {
            setStoredActiveAccountId(targetAccount.id);
            localStorage.setItem('lynks_active_account_id', targetAccount.id);
        }
    };

    const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

    return (
        <OrganizationContext.Provider value={{
            accounts,
            activeAccount,
            setActiveAccountId,
            isLoading,
            refreshAccounts: fetchAccounts
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
