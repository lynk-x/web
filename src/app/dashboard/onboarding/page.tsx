"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const { refreshAccounts } = useOrganization();

    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orgName.trim()) {
            setError('Organization name is required.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call the secure PostgreSQL Function we created during the database schema review
            const { data, error: rpcError } = await supabase.rpc('create_organization_account', {
                org_name: orgName.trim()
            });

            if (rpcError) throw rpcError;

            // Successfully created. Refresh the global context so Sidebar updates.
            await refreshAccounts();

            // Push them into the actual dashboard now that they have an account
            router.push('/dashboard/organize/events');

        } catch (err: any) {
            console.error('Error creating organization:', err);
            setError(err.message || 'Failed to create organization. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                </div>

                <h1 className={styles.title}>Welcome to Lynk-X</h1>
                <p className={styles.subtitle}>
                    You need an Organization Account to create events, sell tickets, or run ads. Let's set one up.
                </p>

                <form onSubmit={handleCreateOrganization} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="orgName" className={styles.label}>Organization Name</label>
                        <input
                            id="orgName"
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="e.g. Acme Events Co."
                            className={styles.input}
                            autoFocus
                        />
                        {error && <p className={styles.errorText}>{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading || !orgName.trim()}
                    >
                        {loading ? 'Creating...' : 'Create Organization'}
                    </button>

                    <p className={styles.footerNote}>
                        You can invite team members and create additional organizations later.
                    </p>
                </form>
            </div>
        </div>
    );
}
