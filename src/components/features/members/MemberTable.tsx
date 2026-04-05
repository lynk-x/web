"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/components/shared/TableRowActions';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/utils/format';
import { sanitizeInput } from '@/utils/sanitization';


export interface AccountMember {
    id: string; // The user ID or invitation ID
    userId?: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'accountant' | 'viewer' | string;
    joinedAt: string;
    isPending?: boolean;
}

const getRoleVariant = (role: string): BadgeVariant => {
    switch (role) {
        case 'owner': return 'primary';
        case 'admin': return 'success';
        case 'accountant': return 'warning';
        case 'viewer': return 'subtle';
        default: return 'neutral';
    }
};

const getRoleLabel = (role: string): string => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function MemberTable() {
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [members, setMembers] = useState<AccountMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Invitation Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [isInviting, setIsInviting] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Fetch Active Members First (from the secure view vw_account_members)
            const { data: memberData, error: memberError } = await supabase
                .from('vw_account_members')
                .select('*')
                .eq('account_id', activeAccount.id);

            if (memberError) throw memberError;

            // Fetch Pending Invitations
            const { data: inviteData, error: inviteError } = await supabase
                .from('account_invitations')
                .select('id, email, role_slug, created_at')
                .eq('account_id', activeAccount.id)
                .is('accepted_at', null);

            if (inviteError) throw inviteError;

            // Map standard members
            const mappedMembers: AccountMember[] = (memberData || []).map(m => ({
                id: m.user_id, // For members, ID is user_id so we do not clash with invites
                userId: m.user_id,
                name: m.full_name || m.user_name || 'Unknown User',
                email: m.email || '',
                role: m.role_slug,
                joinedAt: formatDate(m.joined_at),
                isPending: false
            }));

            // Map pending invitations
            const mappedInvites: AccountMember[] = (inviteData || []).map(i => ({
                id: i.id, // For pending, ID is the invitation ID
                name: 'Pending Invite',
                email: i.email,
                role: i.role_slug,
                joinedAt: formatDate(i.created_at),
                isPending: true
            }));

            setMembers([...mappedMembers, ...mappedInvites]);
        } catch (err: any) {
            showToast(err.message || 'Failed to load team members.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (activeAccount) {
            fetchMembers();
        } else {
            setIsLoading(false);
        }
    }, [activeAccount, fetchMembers]);

    // Handle Checkboxes
    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === members.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(members.map(m => m.id)));
    };

    // Invite Submission via RPC
    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) return;
        if (!inviteEmail) {
            showToast("Email is required.", "error");
            return;
        }

        setIsInviting(true);
        try {
            const { error } = await supabase.rpc('create_account_invitation', {
                p_account_id: activeAccount.id,
                p_email: inviteEmail.toLowerCase(),
                p_role_slug: inviteRole
            });

            if (error) throw error;

            showToast(`An access invite has been sent to ${inviteEmail}.`, "success", "Invite Sent");
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteRole('viewer');
            fetchMembers(); // refresh
        } catch (err: any) {
            showToast(err.message || "We couldn't send the invitation. Please try again later.", "error", "Delivery Failed");
        } finally {
            setIsInviting(false);
        }
    };

    // Row Actions
    const handleRevokeInvite = async (invitationId: string) => {
        try {
            const { error } = await supabase.rpc('revoke_account_invitation', {
                p_invitation_id: invitationId
            });
            if (error) throw error;
            showToast("The pending invitation has been revoked.", "success", "Revoked");
            fetchMembers();
        } catch (err: any) {
            showToast(err.message || "Failed to revoke invitation.", "error", "Error");
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!activeAccount) return;
        try {
            const { error } = await supabase
                .from('account_members')
                .delete()
                .eq('account_id', activeAccount.id)
                .eq('user_id', userId);

            if (error) throw error;
            showToast("Member access has been permanently removed.", "success", "Member Removed");
            fetchMembers();
        } catch (err: any) {
            showToast(err.message || "Failed to remove member.", "error", "Error");
        }
    };

    const columns: Column<AccountMember>[] = [
        {
            header: 'User',
            render: (member) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        backgroundColor: member.isPending ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', color: member.isPending ? 'gray' : 'white',
                        border: member.isPending ? '1px dashed gray' : 'none'
                    }}>
                        {member.isPending ? '?' : member.name.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: member.isPending ? 'gray' : 'white' }}>
                            {member.name}
                            {member.isPending && <span style={{ fontSize: '11px', marginLeft: '6px', color: '#f5a623' }}>Pending</span>}
                        </span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{member.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            render: (member) => <Badge label={getRoleLabel(member.role)} variant={getRoleVariant(member.role)} />
        },
        {
            header: 'Joined / Sent',
            render: (member) => <span style={{ fontSize: '13px', opacity: 0.8 }}>{member.joinedAt}</span>
        }
    ];

    const getActions = (member: AccountMember): ActionItem[] => {
        const actions: ActionItem[] = [];

        if (member.isPending) {
            actions.push({
                label: 'Revoke Invite',
                variant: 'danger' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => handleRevokeInvite(member.id)
            });
        } else if (member.role !== 'owner') {
            actions.push({
                label: 'Change Role',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
                onClick: () => showToast(`Opening role editor for ${member.name}...`, 'info') // Simple stub for future
            });
            actions.push({
                label: 'Remove Member',
                variant: 'danger' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => handleRemoveMember(member.userId!)
            });
        }

        return actions;
    };

    return (
        <div style={{ padding: 0, background: 'transparent', border: 'none' }}>
            {/* Header and Invite Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, marginBottom: '4px', color: 'white' }}>Team Management</h2>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Invite collaborators and manage access levels for your organization.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    style={{
                        background: 'white', color: 'black', border: 'none',
                        padding: '10px 16px', borderRadius: '8px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'box-shadow 0.2s'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Invite Member
                </button>
            </div>

            {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>Loading team members...</div>
            ) : (
                <DataTable<AccountMember>
                    data={members}
                    columns={columns}
                    getActions={getActions}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    emptyMessage="No team members or pending invites found."
                />
            )}

            {/* Invite Modal Overlay */}
            {isInviteModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: '#1a1a1a', padding: '32px', borderRadius: '12px',
                        width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.25rem', color: 'white' }}>Invite Team Member</h3>
                        <p style={{ color: 'gray', fontSize: '0.875rem', marginBottom: '24px' }}>They will receive an email with an invite link.</p>

                        <form onSubmit={handleInviteSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
                                    Email Address <span style={{ color: '#ff4d4d', fontSize: '10px', marginLeft: '6px', position: 'relative', top: '-4px', fontWeight: 600 }}>*Required</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(sanitizeInput(e.target.value.toLowerCase()))}
                                    placeholder="colleague@example.com"
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
                                    Access Level <span style={{ color: '#ff4d4d', fontSize: '10px', marginLeft: '6px', position: 'relative', top: '-4px', fontWeight: 600 }}>*Required</span>
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.2)', background: '#1a1a1a', color: 'white'
                                    }}
                                >
                                    <option value="admin">Administrator (Full Access)</option>
                                    <option value="accountant">Accountant (Revenues & Payouts)</option>
                                    <option value="viewer">Viewer (Read-only)</option>
                                    {/* Exclude 'owner', only system/owner transfers should grant 'owner' */}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    style={{
                                        background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                                        padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    style={{
                                        background: 'white', color: 'black', border: 'none',
                                        padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
                                        opacity: isInviting ? 0.7 : 1
                                    }}
                                >
                                    {isInviting ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
