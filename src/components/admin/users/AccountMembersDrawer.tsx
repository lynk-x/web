"use client";

import React from 'react';
import styles from './AccountMembersDrawer.module.css';
import { User } from '@/types/admin';
import { getInitials } from '@/utils/format';

interface Member {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'staff' | 'member';
    lastActive: string;
}

interface AccountMembersDrawerProps {
    account: User | null;
    onClose: () => void;
}

export default function AccountMembersDrawer({ account, onClose }: AccountMembersDrawerProps) {
    if (!account) return null;

    // Mock members for the UI preview
    const members: Member[] = [
        { id: '1', name: account.name, email: account.email, role: 'owner', lastActive: 'Online now' },
        { id: '2', name: 'Sarah Chen', email: 'sarah.c@lynk-x.com', role: 'admin', lastActive: '2h ago' },
        { id: '3', name: 'Marcus Miller', email: 'm.miller@lynk-x.com', role: 'staff', lastActive: 'Yesterday' },
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Account Members</h2>
                        <span className={styles.subtitle}>
                            Reference: #{account.id.slice(0, 8).toUpperCase()} • {account.role}
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
                    <div className={styles.memberList}>
                        {members.map((member) => (
                            <div key={member.id} className={styles.memberCard}>
                                <div className={styles.avatar}>
                                    {getInitials(member.name)}
                                </div>
                                <div className={styles.memberInfo}>
                                    <span className={styles.memberName}>{member.name}</span>
                                    <span className={styles.memberEmail}>{member.email}</span>
                                    <span style={{ fontSize: '10px', opacity: 0.4, marginTop: '2px' }}>
                                        Active {member.lastActive}
                                    </span>
                                </div>
                                <span className={styles.roleBadge}>{member.role}</span>
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
