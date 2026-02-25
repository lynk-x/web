"use client";

import React, { useState } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/components/shared/TableRowActions';

export interface AccountMember {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'finance_manager' | 'viewer';
    joinedAt: string;
}

const mockMembers: AccountMember[] = [
    { id: 'm1', userId: 'u1', name: 'Alice Walker', email: 'alice@example.com', role: 'owner', joinedAt: '2025-01-10' },
    { id: 'm2', userId: 'u2', name: 'Bob Finance', email: 'bob@example.com', role: 'finance_manager', joinedAt: '2025-03-15' },
    { id: 'm3', userId: 'u3', name: 'Charlie Admin', email: 'charlie@example.com', role: 'admin', joinedAt: '2025-05-01' },
    { id: 'm4', userId: 'u4', name: 'Diana Viewer', email: 'diana@example.com', role: 'viewer', joinedAt: '2025-06-20' },
];

const getRoleVariant = (role: string): BadgeVariant => {
    switch (role) {
        case 'owner': return 'primary';
        case 'admin': return 'success';
        case 'finance_manager': return 'warning';
        case 'viewer': return 'subtle';
        default: return 'neutral';
    }
};

const getRoleLabel = (role: string): string => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function MemberTable() {
    const { showToast } = useToast();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === mockMembers.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(mockMembers.map(m => m.id)));
    };

    const columns: Column<AccountMember>[] = [
        {
            header: 'User',
            render: (member) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {member.name.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: 'white' }}>{member.name}</span>
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
            header: 'Joined',
            render: (member) => <span style={{ fontSize: '13px', opacity: 0.8 }}>{member.joinedAt}</span>
        }
    ];

    const getActions = (member: AccountMember): ActionItem[] => {
        const actions: ActionItem[] = [];

        if (member.role !== 'owner') {
            actions.push({
                label: 'Change Role',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
                onClick: () => showToast(`Opening role editor for ${member.name}...`, 'info')
            });
            actions.push({
                label: 'Remove Member',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => showToast(`Removed ${member.name} from team.`, 'error')
            });
        }

        return actions;
    };

    return (
        <DataTable<AccountMember>
            data={mockMembers}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            emptyMessage="No team members found."
        />
    );
}
