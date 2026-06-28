"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '../admin/page.module.css';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import Modal from '@/components/shared/Modal';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { MfaManager } from '@/components/MfaManager';
import MemberTable from '@/components/features/members/MemberTable';
import PaymentMethodsManager from '@/components/features/members/PaymentMethodsManager';

export default function PulseSettings({ accountId }: { accountId: string }) {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('account');

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            // 1. Deactivate the specific business account
            const { error: accountError } = await supabase
                .schema('api' as any)
                .from('v1_accounts')
                .delete()
                .eq('id', accountId);

            if (accountError) throw accountError;

            // 2. Shred the entire user data (GDPR Compliance)
            const { error: shredError } = await supabase.schema('api').rpc('shred_user_data');
            if (shredError) throw shredError;

            showToast('Account successfully deactivated and data shredded.', 'success');
            setIsDeleteModalOpen(false);
            
            // Log them out and redirect home since their identity is now destroyed
            await supabase.auth.signOut();
            router.push('/');
        } catch (err: any) {
            showToast(err.message || 'Failed to deactivate account.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="team">Team Members</TabsTrigger>
                        <TabsTrigger value="billing">Billing & Wallet</TabsTrigger>
                        <TabsTrigger value="danger-zone">Danger Zone</TabsTrigger>
                    </TabsList>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <TabsContent value="account">
                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle}>Account Profile</h2>
                            <p style={{ opacity: 0.8 }}>Manage your Pulse account information and primary contact details.</p>
                            {/* Placeholder for account form, can be expanded later */}
                            <div style={{ marginTop: '16px', opacity: 0.5 }}>
                                Account details configuration coming soon.
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="team">
                        <div className={adminStyles.pageCard}>
                            <MemberTable />
                        </div>
                    </TabsContent>

                    <TabsContent value="billing">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className={adminStyles.pageCard}>
                                <h2 className={adminStyles.sectionTitle}>Payment Methods</h2>
                                {accountId ? (
                                    <PaymentMethodsManager accountId={accountId} />
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an organization to manage payment methods.</div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="danger-zone">
                        <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: 'var(--color-interface-warning)' }}>Account Security</h2>
                            <MfaManager />
                        </div>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle} style={{ color: 'var(--color-interface-error)' }}>Danger Zone</h2>
                            <p className={adminStyles.label} style={{ marginBottom: '16px', fontWeight: 400, opacity: 0.8 }}>
                                Deactivating your pulse account pauses all active analysis and intelligence monitoring. This action cannot be undone.
                            </p>
                            
                            <div style={{ padding: '24px', border: '1px solid var(--color-status-error)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-status-error)' }}>Deactivate Pulse Account & Shred Data</h4>
                                        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                                            This will instantly disable your Pulse account and cryptographically shred all your personal identity data in compliance with GDPR.
                                        </p>
                                    </div>
                                    <button 
                                        className={adminStyles.btnDanger}
                                        onClick={() => setIsDeleteModalOpen(true)}
                                    >
                                        Deactivate Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Danger Zone Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Deactivate Account & Shred Data"
                footer={
                    <>
                        <button 
                            className={adminStyles.btnSecondary} 
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button 
                            className={adminStyles.btnDanger} 
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Processing...' : 'Yes, Deactivate & Shred'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-status-error)' }}>
                        <strong>⚠️ WARNING: NUCLEAR ACTION</strong>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                            You are about to execute a cryptographic shredding of your identity data.
                        </p>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', opacity: 0.9 }}>
                        <li>Your data will be permanently destroyed.</li>
                        <li>You will be immediately logged out and lose access to all Lynk-X services.</li>
                    </ul>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Are you absolutely sure you want to proceed?</p>
                </div>
            </Modal>
        </div>
    );
}
