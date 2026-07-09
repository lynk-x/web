"use client";

/**
 * System Security page — PII encryption key (KEK) rotation and a read-only
 * Vault secrets inventory.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { formatDate } from '@/utils/format';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Badge from '@/components/shared/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import styles from './page.module.css';

type Tab = 'encryption' | 'vault';

interface KekRotationStatus {
    current_kek_version: number;
    users_by_kek_version: Record<string, number>;
    rotation_in_progress: boolean;
}

interface VaultSecret {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

function SystemSecurityContent() {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const initialTab = searchParams.get('tab') as Tab;
    const [activeTab, setActiveTab] = useState<Tab>(
        (initialTab && ['encryption', 'vault'].includes(initialTab)) ? initialTab : 'encryption'
    );

    const [kekStatus, setKekStatus] = useState<KekRotationStatus | null>(null);
    const [vaultSecrets, setVaultSecrets] = useState<VaultSecret[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRotating, setIsRotating] = useState(false);

    const handleTabChange = (value: string) => {
        setActiveTab(value as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const fetchKekStatus = useCallback(async () => {
        const { data, error } = await supabase.schema('api').rpc('get_kek_rotation_status');
        if (error) {
            showToast(getErrorMessage(error), 'error');
            return;
        }
        setKekStatus(data as KekRotationStatus);
    }, [supabase, showToast]);

    const fetchVaultSecrets = useCallback(async () => {
        const { data, error } = await supabase.schema('api').rpc('get_vault_secrets_inventory');
        if (error) {
            showToast(getErrorMessage(error), 'error');
            return;
        }
        setVaultSecrets((data as VaultSecret[]) || []);
    }, [supabase, showToast]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([fetchKekStatus(), fetchVaultSecrets()]);
            setIsLoading(false);
        };
        init();
    }, [fetchKekStatus, fetchVaultSecrets]);

    // Poll rotation status every 5s while a rotation is in flight, so the
    // "in progress" state clears on its own once the queue worker finishes.
    useEffect(() => {
        if (!kekStatus?.rotation_in_progress) return;
        const interval = setInterval(fetchKekStatus, 5000);
        return () => clearInterval(interval);
    }, [kekStatus?.rotation_in_progress, fetchKekStatus]);

    const handleRotate = async () => {
        const confirmed = await confirm(
            'This will generate a new encryption key and re-encrypt every user\'s data key onto it. ' +
            'This action cannot be undone. Continue?',
            { title: 'Rotate Encryption Key', confirmLabel: 'Rotate Key', variant: 'danger' }
        );
        if (!confirmed) return;

        setIsRotating(true);
        try {
            const { error } = await supabase.schema('api').rpc('rotate_pii_master_kek');
            if (error) throw error;
            showToast('Key rotation queued — this may take a moment to complete.', 'success');
            await fetchKekStatus();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsRotating(false);
        }
    };

    const versionEntries = Object.entries(kekStatus?.users_by_kek_version || {});
    const totalUsers = versionEntries.reduce((sum, [, count]) => sum + count, 0);

    return (
        <div className={sharedStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Security"
                subtitle="Manage PII encryption keys and view registered Vault secrets."
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="encryption">Encryption</TabsTrigger>
                    <TabsTrigger value="vault">Vault</TabsTrigger>
                </TabsList>

                <TabsContent value="encryption">
                    <div className={sharedStyles.pageCard}>
                        {isLoading ? (
                            <div className={styles.loadingState}>Loading encryption status...</div>
                        ) : (
                            <div className={styles.encryptionPanel}>
                                <div className={styles.statusRow}>
                                    <div>
                                        <span className={styles.statusLabel}>Current KEK Version</span>
                                        <div className={styles.statusValue}>
                                            v{kekStatus?.current_kek_version ?? '—'}
                                            {kekStatus?.rotation_in_progress && (
                                                <Badge label="Rotation in progress" variant="warning" showDot />
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.rotateBtn}
                                        onClick={handleRotate}
                                        disabled={isRotating || kekStatus?.rotation_in_progress}
                                    >
                                        {kekStatus?.rotation_in_progress ? 'Rotating...' : isRotating ? 'Queuing...' : 'Rotate Key Now'}
                                    </button>
                                </div>

                                <div className={styles.versionTable}>
                                    <h3>Users by Key Version</h3>
                                    {versionEntries.length === 0 ? (
                                        <p className={styles.emptyText}>No user credentials found.</p>
                                    ) : (
                                        <div className={styles.versionGrid}>
                                            {versionEntries.map(([version, count]) => (
                                                <div key={version} className={styles.versionItem}>
                                                    <label>Version {version}</label>
                                                    <span>{count.toLocaleString()} users</span>
                                                    <div className={styles.versionBar}>
                                                        <div
                                                            className={styles.versionBarFill}
                                                            style={{ width: totalUsers > 0 ? `${(count / totalUsers) * 100}%` : '0%' }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="vault">
                    <div className={sharedStyles.pageCard}>
                        {isLoading ? (
                            <div className={styles.loadingState}>Loading Vault secrets...</div>
                        ) : vaultSecrets.length === 0 ? (
                            <div className={styles.emptyText}>No secrets registered in Vault.</div>
                        ) : (
                            <div className={styles.secretsList}>
                                {vaultSecrets.map((secret) => (
                                    <div key={secret.id} className={styles.secretItem}>
                                        <div className={styles.secretInfo}>
                                            <span className={styles.secretName}>{secret.name}</span>
                                            {secret.description && (
                                                <span className={styles.secretDesc}>{secret.description}</span>
                                            )}
                                        </div>
                                        <span className={styles.secretDate}>
                                            Updated {formatDate(secret.updated_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function SystemSecurityPage() {
    return (
        <Suspense fallback={<div className={sharedStyles.container}>Loading...</div>}>
            <SystemSecurityContent />
        </Suspense>
    );
}
