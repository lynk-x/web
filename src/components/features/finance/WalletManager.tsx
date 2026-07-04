"use client";

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { createClient } from '@/utils/supabase/client';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Button from '@/components/shared/Button';
import WalletsTable from './WalletsTable';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { AccountWallet } from '@/types/organize';
import { useAccountPermissions } from '@/hooks/useAccountPermissions';
import { useOrganizerOnboarding } from '@/hooks/useOrganizerOnboarding';

interface WalletManagerProps {
    accountId: string;
    wallets: AccountWallet[];
    isLoading: boolean;
    onRefresh: () => void;
}

export default function WalletManager({ accountId, wallets, isLoading, onRefresh }: WalletManagerProps) {
    const { showToast } = useToast();
    const supabase = createClient();

    const { can } = useAccountPermissions(accountId);
    const hasManageBilling = can('can_manage_billing');
    const { status: onboardingStatus } = useOrganizerOnboarding(accountId);
    const isKycApproved = onboardingStatus?.kyc_status === 'approved';

    const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
    const [newWalletCurrency, setNewWalletCurrency] = useState('USD');
    const [isAddingWallet, setIsAddingWallet] = useState(false);

    const handleAddWallet = async () => {
        if (!accountId || !isKycApproved) return;
        setIsAddingWallet(true);
        try {
            const { error } = await supabase.schema('api').rpc('create_wallet', {
                p_currency: newWalletCurrency,
                p_account_id: accountId
            });
            if (error) throw error;
            showToast(`Successfully created ${newWalletCurrency} wallet.`, 'success');
            setIsAddWalletOpen(false);
            onRefresh();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create wallet.', 'error');
        } finally {
            setIsAddingWallet(false);
        }
    };

    return (
        <div className={adminStyles.pageCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className={adminStyles.sectionTitle} style={{ margin: 0 }}>Account Wallets</h2>
                {hasManageBilling && (
                    <Button
                        variant="secondary"
                        onClick={() => setIsAddWalletOpen(true)}
                        disabled={!isKycApproved}
                        title={!isKycApproved ? 'Complete KYC verification before creating a wallet.' : undefined}
                    >
                        Add Wallet
                    </Button>
                )}
            </div>

            {hasManageBilling && !isKycApproved && (
                <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 16px' }}>
                    Complete KYC verification above before creating a payout wallet.
                </p>
            )}

            <WalletsTable
                data={wallets} 
                isLoading={isLoading} 
                accountId={accountId} 
                onRefresh={onRefresh} 
            />

            <ConfirmationModal
                isOpen={isAddWalletOpen}
                onClose={() => setIsAddWalletOpen(false)}
                onConfirm={handleAddWallet}
                title="Create New Wallet"
                message="Select the currency for your new wallet. Wallets are used to hold balances and process transactions in specific currencies."
                confirmLabel={isAddingWallet ? "Creating..." : "Create Wallet"}
                variant="default"
            >
                <div style={{ marginTop: '16px' }}>
                    <label className={adminStyles.label}>Currency</label>
                    <select 
                        className={adminStyles.input}
                        value={newWalletCurrency}
                        onChange={(e) => setNewWalletCurrency(e.target.value)}
                        disabled={isAddingWallet}
                        style={{ marginTop: '8px' }}
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="EUR">EUR - Euro</option>
                    </select>
                </div>
            </ConfirmationModal>
        </div>
    );
}
