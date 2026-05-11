"use client";

import React, { useEffect, useState, useMemo } from 'react';
import styles from './AccountMembersDrawer.module.css';
import { AdminAccount } from '@/types/admin';
import { getInitials } from '@/utils/format';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface Member {
    user_id: string;
    user_name: string;
    full_name: string;
    email: string;
    role_slug: string;
    is_primary: boolean;
    joined_at: string;
}

interface AccountMembersDrawerProps {
    account: AdminAccount | null;
    onClose: () => void;
}

export default function AccountMembersDrawer({ account, onClose }: AccountMembersDrawerProps) {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (account) {
            fetchMembers();
        }
    }, [account]);

    const fetchMembers = async () => {
        if (!account) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_account_members', {
                p_account_id: account.id
            });

            if (error) throw error;
            setMembers(data || []);
        } catch (err: any) {
            showToast(err.message || "Failed to load members", "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (!account) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Account Members</h2>
                        <span className={styles.subtitle}>
                            {account.display_name} • {account.reference}
                        </span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.content}>
                    <h3 className={styles.sectionTitle}>Authorized Users ({members.length})</h3>
                    {isLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Loading members...</div>
                    ) : (
                        <div className={styles.memberList}>
                            {members.map((member) => (
                                <div key={member.user_id} className={styles.memberCard}>
                                    <div className={styles.avatar}>
                                        {getInitials(member.full_name || member.user_name)}
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className={styles.memberName}>{member.full_name || member.user_name}</span>
                                            {member.is_primary && (
                                                <span style={{ 
                                                    fontSize: '9px', 
                                                    padding: '1px 4px', 
                                                    backgroundColor: 'var(--color-brand-primary)', 
                                                    color: 'black', 
                                                    borderRadius: '2px',
                                                    fontWeight: 700
                                                }}>PRIMARY</span>
                                            )}
                                        </div>
                                        <span className={styles.memberEmail}>{member.email}</span>
                                        <span style={{ fontSize: '10px', opacity: 0.4, marginTop: '2px' }}>
                                            Joined {new Date(member.joined_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <span className={styles.roleBadge}>{member.role_slug}</span>
                                    <button className={styles.closeButton}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.inviteButton}>
                        Invite New Member
                    </button>
                </div>
            </div>
        </div>
    );
}

