"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createAccountsRepository } from '@/lib/repositories';
import { useAuth } from '@/context/AuthContext';

export interface Account {
    id: string;
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
    const supabase = createClient();
    const { user, isLoading: isLoadingAuth } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setStoredActiveAccountId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAccounts = React.useCallback(async (): Promise<Account[]> => {
        // If auth is still checking, we must remain in loading state.
        if (isLoadingAuth) {
            setIsLoading(true);
            return [];
        }

        // Auth is finished. If no user, we have no accounts.
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
                setIsLoading(false);
                return [];
            }

            if (memberships && memberships.length > 0) {
                setAccounts(memberships);

                const savedId = localStorage.getItem('lynks_active_account_id');
                const primaryAccount = memberships.find(a => a.isPrimary);

                if (savedId && memberships.some(a => a.id === savedId)) {
                    setStoredActiveAccountId(savedId);
                } else if (primaryAccount) {
                    setStoredActiveAccountId(primaryAccount.id);
                    localStorage.setItem('lynks_active_account_id', primaryAccount.id);
                } else {
                    setStoredActiveAccountId(memberships[0].id);
                    localStorage.setItem('lynks_active_account_id', memberships[0].id);
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
    }, [user, isLoadingAuth, supabase]);

    useEffect(() => {
        if (!isLoadingAuth) {
            fetchAccounts();
        } else {
            setIsLoading(true);
        }
    }, [isLoadingAuth, fetchAccounts]);

    const setActiveAccountId = (id: string) => {
        if (accounts.some(a => a.id === id)) {
            setStoredActiveAccountId(id);
            localStorage.setItem('lynks_active_account_id', id);
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
