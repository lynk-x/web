"use client";

/**
 * Identity & Access Management (IAM) Page.
 * Governs platform-level administrators, roles, and granular security permissions.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import DataTable from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import BulkActionsBar from '@/components/shared/BulkActionsBar';
import { useDebounce } from '@/hooks/useDebounce';
import AccountTable from '@/components/admin/users/AccountTable';
import type { AdminAccount } from '@/types/admin';
import type { BadgeVariant } from '@/types/shared';

interface AccountRole {
    id: string;
    role_slug: string;
    display_name: string;
    description: string;
    status?: string;
}

interface AccountPermission {
    slug: string;
    category: string;
    description: string;
}

interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

const ToggleSwitch = ({ checked, onChange, disabled }: ToggleSwitchProps) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        style={{
            position: 'relative',
            width: '40px',
            height: '22px',
            borderRadius: '11px',
            backgroundColor: checked ? 'var(--color-status-success, #10b981)' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--color-interface-outline)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            opacity: disabled ? 0.5 : 1,
            padding: 0,
            flexShrink: 0
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: '2px',
                left: checked ? '20px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}
        />
    </button>
);

function IAMContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Default schema client for standard tables
    const supabase = useMemo(() => createClient(), []);

    // Custom API schema client for IAM RPCs
    const supabaseApi = useMemo(() => createClient('api'), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'accounts');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    // States
    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [accountsPage, setAccountsPage] = useState(1);
    const [accountsTotalCount, setAccountsTotalCount] = useState(0);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountType, setAccountType] = useState('all');

    const [roles, setRoles] = useState<AccountRole[]>([]);
    const [permissions, setPermissions] = useState<AccountPermission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<{ [roleSlug: string]: Set<string> }>({});
    
    const [isLoading, setIsLoading] = useState(true);

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccountRole | null>(null);
    const [roleForm, setRoleForm] = useState({
        display_name: '',
        description: ''
    });

    // Selected permissions for bulk actions
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

    // States for assigning/revoking permission to/from a specific role
    const [isAssignPermModalOpen, setIsAssignPermModalOpen] = useState(false);
    const [selectedPerm, setSelectedPerm] = useState<AccountPermission | null>(null);
    const [targetRoleSlug, setTargetRoleSlug] = useState('');

    const [matrixActiveRoleSlug, setMatrixActiveRoleSlug] = useState<string>('');

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setSelectedPermissions(new Set()); // Reset selections when switching tabs
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Load directory of platform accounts
    const fetchAccounts = useCallback(async () => {
        setIsLoadingAccounts(true);
        try {
            const { data, error } = await supabaseApi.rpc('get_admin_accounts', {
                p_search: debouncedSearch.trim(),
                p_type: accountType,
                p_status: 'all',
                p_country_code: 'all',
                p_offset: (accountsPage - 1) * 10,
                p_limit: 10
            });

            if (error) throw error;

            setAccounts(data || []);
            setAccountsTotalCount(data?.[0]?.total_count ? Number(data[0].total_count) : 0);
        } catch (err: unknown) {
            console.error('Error fetching accounts:', err);
            showToast('Failed to load accounts database.', 'error');
        } finally {
            setIsLoadingAccounts(false);
        }
    }, [supabaseApi, showToast, debouncedSearch, accountType, accountsPage]);

    // Load global roles and permissions matrix
    const fetchIAMData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch Roles
            const { data: rolesData, error: rolesError } = await supabase
                .from('account_roles')
                .select('*')
                .order('display_name');
            if (rolesError) throw rolesError;
            setRoles(rolesData || []);
            if (rolesData && rolesData.length > 0) {
                setMatrixActiveRoleSlug(prev => prev || rolesData[0].role_slug);
            }

            // Fetch Permissions
            const { data: permsData, error: permsError } = await supabase
                .from('account_permissions')
                .select('*')
                .order('category', { ascending: true })
                .order('slug', { ascending: true });
            if (permsError) throw permsError;
            setPermissions(permsData || []);

            // Fetch mappings
            const { data: mappingData, error: mappingError } = await supabase
                .from('account_role_permissions')
                .select('role_id, permission_slug');
            if (mappingError) throw mappingError;

            // Group permissions by role_slug
            const mappingMap: { [roleSlug: string]: Set<string> } = {};
            rolesData?.forEach(r => {
                mappingMap[r.role_slug] = new Set<string>();
            });

            mappingData?.forEach(m => {
                const matchedRole = rolesData?.find(r => r.id === m.role_id);
                if (matchedRole) {
                    mappingMap[matchedRole.role_slug].add(m.permission_slug);
                }
            });

            setRolePermissions(mappingMap);
        } catch (error) {
            console.error('Error fetching IAM configs:', error);
            showToast(getErrorMessage(error) || 'Failed to fetch IAM metadata', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchIAMData();
    }, [fetchIAMData]);

    useEffect(() => {
        setAccountsPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        if (activeTab === 'accounts') {
            fetchAccounts();
        }
    }, [activeTab, fetchAccounts]);

    // Toggle single permission in role-permissions matrix
    const handleTogglePermission = async (roleSlug: string, permSlug: string) => {
        const currentPerms = new Set(rolePermissions[roleSlug] || []);
        
        if (currentPerms.has(permSlug)) {
            currentPerms.delete(permSlug);
        } else {
            currentPerms.add(permSlug);
        }

        // Optimistically update frontend state
        setRolePermissions(prev => ({
            ...prev,
            [roleSlug]: currentPerms
        }));

        try {
            const { error } = await supabaseApi.rpc('update_role_permissions', {
                p_role_slug: roleSlug,
                p_permission_slugs: Array.from(currentPerms)
            });
            if (error) throw error;
            showToast(`Permissions updated for role ${roleSlug}`, 'success');
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to update permissions', 'error');
            // Revert state on error
            fetchIAMData();
        }
    };

    // Save modified role details
    const handleSaveRole = async () => {
        if (!editingRole) return;
        setIsLoading(true);
        try {
            const { error } = await supabaseApi.rpc('update_role_details', {
                p_role_id: editingRole.id,
                p_display_name: roleForm.display_name,
                p_description: roleForm.description
            });
            if (error) throw error;
            showToast('Role updated successfully', 'success');
            setIsRoleModalOpen(false);
            await fetchIAMData();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to update role', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Delete custom role
    const handleDeleteRole = useCallback(async (role: AccountRole) => {
        if (!window.confirm(`Are you sure you want to delete the role "${role.display_name}"? This action cannot be undone.`)) {
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabaseApi.rpc('delete_custom_role', {
                p_role_id: role.id
            });
            if (error) throw error;
            showToast('Role deleted successfully', 'success');
            await fetchIAMData();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to delete role', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabaseApi, showToast, fetchIAMData]);

    // Handle single permission assign/revoke to/from a role
    const handlePermissionRoleAction = async (action: 'assign' | 'revoke') => {
        if (!selectedPerm || !targetRoleSlug) return;
        setIsLoading(true);
        try {
            const currentPerms = new Set(rolePermissions[targetRoleSlug] || []);
            if (action === 'assign') {
                currentPerms.add(selectedPerm.slug);
            } else {
                currentPerms.delete(selectedPerm.slug);
            }

            const { error } = await supabaseApi.rpc('update_role_permissions', {
                p_role_slug: targetRoleSlug,
                p_permission_slugs: Array.from(currentPerms)
            });
            if (error) throw error;
            
            showToast(`Permission "${selectedPerm.slug}" successfully ${action === 'assign' ? 'assigned to' : 'revoked from'} role "${targetRoleSlug}"`, 'success');
            setIsAssignPermModalOpen(false);
            await fetchIAMData();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to update permission mapping', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Bulk assign selected permissions to all roles
    const handleBulkAssign = async () => {
        if (selectedPermissions.size === 0) return;
        const count = selectedPermissions.size;
        if (!window.confirm(`Are you sure you want to assign the ${count} selected permissions to ALL roles?`)) {
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabaseApi.rpc('bulk_assign_permissions_to_all_roles', {
                p_permission_slugs: Array.from(selectedPermissions)
            });
            if (error) throw error;
            showToast(`Successfully assigned ${count} permissions to all roles`, 'success');
            setSelectedPermissions(new Set());
            await fetchIAMData();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to assign bulk permissions', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Bulk revoke selected permissions from all roles
    const handleBulkRevoke = async () => {
        if (selectedPermissions.size === 0) return;
        const count = selectedPermissions.size;
        if (!window.confirm(`Are you sure you want to revoke the ${count} selected permissions from ALL roles?`)) {
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabaseApi.rpc('bulk_revoke_permissions_from_all_roles', {
                p_permission_slugs: Array.from(selectedPermissions)
            });
            if (error) throw error;
            showToast(`Successfully revoked ${count} permissions from all roles`, 'success');
            setSelectedPermissions(new Set());
            await fetchIAMData();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to revoke bulk permissions', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Selection handlers for permissions table
    const handleSelectPermission = (id: string) => {
        const next = new Set(selectedPermissions);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedPermissions(next);
    };

    const handleSelectAllPermissions = () => {
        if (selectedPermissions.size === mappedPermissions.length) {
            setSelectedPermissions(new Set());
        } else {
            setSelectedPermissions(new Set(mappedPermissions.map(p => p.id)));
        }
    };

    // Group permissions by category for visual hierarchy in matrix
    const groupedPermissions = useMemo(() => {
        const groups: { [category: string]: AccountPermission[] } = {};
        permissions.forEach(p => {
            if (!groups[p.category]) {
                groups[p.category] = [];
            }
            groups[p.category].push(p);
        });
        return groups;
    }, [permissions]);

    // Filtering roles based on search term
    const filteredRoles = useMemo(() => {
        return roles.filter(r => 
            r.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.role_slug?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [roles, debouncedSearch]);

    // Filtering permissions based on search term
    const filteredPermissions = useMemo(() => {
        return permissions.filter(p => 
            p.slug?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            p.category?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            p.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [permissions, debouncedSearch]);

    // Map permissions to have a standard ID property for DataTable
    const mappedPermissions = useMemo(() => {
        return filteredPermissions.map(p => ({
            ...p,
            id: p.slug
        }));
    }, [filteredPermissions]);

    // Columns config for Roles Table
    const roleColumns = useMemo(() => [
        {
            header: 'Role Slug',
            render: (role: AccountRole) => <code>{role.role_slug}</code>
        },
        {
            header: 'Role Name',
            render: (role: AccountRole) => (
                <div style={{ fontWeight: 500 }}>{role.display_name}</div>
            )
        },
        {
            header: 'Description',
            render: (role: AccountRole) => (
                <div style={{ opacity: 0.8, maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {role.description || 'No description provided.'}
                </div>
            )
        },
        {
            header: 'Status',
            render: (role: AccountRole) => {
                const getStatusVariant = (status: string): BadgeVariant => {
                    switch (status) {
                        case 'approved': return 'success';
                        case 'pending':
                        case 'under_review':
                        case 'appealed': return 'warning';
                        case 'rejected':
                        case 'flagged':
                        case 'expired': return 'error';
                        default: return 'neutral';
                    }
                };
                const statusLabel = role.status ? role.status.replace(/_/g, ' ').toUpperCase() : 'APPROVED';
                return (
                    <Badge 
                        label={statusLabel} 
                        variant={getStatusVariant(role.status || 'approved')} 
                        showDot 
                    />
                );
            }
        }
    ], []);

    const getRoleActions = useCallback((role: AccountRole) => {
        const actions = [
            {
                label: 'Edit details',
                onClick: () => {
                    setEditingRole(role);
                    setRoleForm({
                        display_name: role.display_name,
                        description: role.description || ''
                    });
                    setIsRoleModalOpen(true);
                }
            }
        ];

        const isSystemRole = ['super_admin', 'admin', 'moderator', 'reviewer', 'support_agent', 'owner', 'member'].includes(role.role_slug);
        if (!isSystemRole) {
            actions.push({
                label: 'Delete role',
                onClick: () => handleDeleteRole(role)
            });
        }

        return actions;
    }, [handleDeleteRole]);

    const getPermissionActions = useCallback((perm: AccountPermission) => [
        {
            label: 'Filter in matrix',
            onClick: () => {
                setSearchTerm(perm.slug);
                setActiveTab('matrix');
            }
        },
        {
            label: 'Copy slug',
            onClick: () => {
                navigator.clipboard.writeText(perm.slug);
                showToast('Permission slug copied to clipboard', 'success');
            }
        },
        {
            label: 'Assign/Revoke for role...',
            onClick: () => {
                setSelectedPerm(perm);
                setTargetRoleSlug(roles[0]?.role_slug || '');
                setIsAssignPermModalOpen(true);
            }
        }
    ], [showToast, roles]);

    // Columns config for Permissions Table
    const permissionColumns = useMemo(() => [
        {
            header: 'Permission Slug',
            render: (perm: AccountPermission) => <code>{perm.slug}</code>
        },
        {
            header: 'Description',
            render: (perm: AccountPermission) => (
                <div style={{ opacity: 0.8, maxWidth: '500px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {perm.description}
                </div>
            )
        }
    ], []);

    const accountsTotalPages = Math.ceil(accountsTotalCount / 10);

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Identity & Access (IAM)"
                subtitle="Manage platform-level system roles, accounts, and granular security permissions."
            />

            <TableToolbar 
                searchPlaceholder="Search accounts, roles or permissions..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {activeTab === 'accounts' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { value: 'all', label: 'All Accounts' },
                            { value: 'platform', label: 'Platform' },
                            { value: 'organizer', label: 'Organizer' },
                            { value: 'advertiser', label: 'Advertiser' },
                            { value: 'pulse_user', label: 'Pulse User' }
                        ].map((chip) => (
                            <button
                                key={chip.value}
                                className={accountType === chip.value ? adminStyles.chipActive : adminStyles.chip}
                                onClick={() => setAccountType(chip.value)}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                )}
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="accounts">Accounts</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                        <TabsTrigger value="matrix">Role Permissions</TabsTrigger>
                    </TabsList>
                </div>

                <div style={{ marginTop: '24px' }}>
                    {/* Tab 1: Accounts */}
                    <TabsContent value="accounts">
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <AccountTable 
                                accounts={accounts}
                                isLoading={isLoadingAccounts}
                                currentPage={accountsPage}
                                totalPages={accountsTotalPages}
                                onPageChange={setAccountsPage}
                                onRefresh={fetchAccounts}
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 2: Roles */}
                    <TabsContent value="roles">
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={filteredRoles}
                                columns={roleColumns}
                                getActions={getRoleActions}
                                isLoading={isLoading}
                                emptyMessage="No roles configured."
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 3: Permissions List */}
                    <TabsContent value="permissions">
                        {selectedPermissions.size > 0 && (
                            <BulkActionsBar
                                selectedCount={selectedPermissions.size}
                                onCancel={() => setSelectedPermissions(new Set())}
                                actions={[
                                    { label: 'Assign Selected to All Roles', onClick: handleBulkAssign, variant: 'success' },
                                    { label: 'Revoke Selected from All Roles', onClick: handleBulkRevoke, variant: 'danger' }
                                ]}
                            />
                        )}
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={mappedPermissions}
                                columns={permissionColumns}
                                getActions={getPermissionActions}
                                selectedIds={selectedPermissions}
                                onSelect={handleSelectPermission}
                                onSelectAll={handleSelectAllPermissions}
                                isLoading={isLoading}
                                emptyMessage="No permissions found."
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 4: Permissions Matrix */}
                    <TabsContent value="matrix">
                        <div style={{ display: 'flex', gap: '32px', minHeight: '550px', flexDirection: 'row', flexWrap: 'wrap' }}>
                            {/* Left Column: Roles list */}
                            <div style={{
                                flex: '1 1 260px',
                                maxWidth: '320px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                borderRight: '1px solid var(--color-interface-outline)',
                                paddingRight: '24px'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    System Roles
                                </div>
                                {roles.map(role => {
                                    const isActive = matrixActiveRoleSlug === role.role_slug;
                                    const activeCount = rolePermissions[role.role_slug]?.size || 0;
                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setMatrixActiveRoleSlug(role.role_slug)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                                                border: isActive ? '1px solid var(--color-interface-outline)' : '1px solid transparent',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                width: '100%',
                                                transition: 'background-color 0.2s, border-color 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                <span style={{ fontWeight: isActive ? 600 : 500, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                                                    {role.display_name}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isActive ? 'var(--color-status-success)' : 'rgba(255, 255, 255, 0.08)',
                                                    color: isActive ? '#000000' : 'var(--color-text-primary)',
                                                    fontWeight: 600
                                                }}>
                                                    {activeCount} perms
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                                                {role.role_slug}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right Column: Grouped permissions with toggle switches */}
                            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {matrixActiveRoleSlug ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-interface-outline)', paddingBottom: '12px' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                    {roles.find(r => r.role_slug === matrixActiveRoleSlug)?.display_name} Permissions
                                                </h3>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.6 }}>
                                                    Configure granular access control permissions for this administrative tier.
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {Object.keys(groupedPermissions).map(category => {
                                                const catPerms = groupedPermissions[category];
                                                return (
                                                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            {category} ({catPerms.filter(p => rolePermissions[matrixActiveRoleSlug]?.has(p.slug)).length} / {catPerms.length} Active)
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {catPerms.map(perm => {
                                                                const isChecked = !!rolePermissions[matrixActiveRoleSlug]?.has(perm.slug);
                                                                const isLocked = (matrixActiveRoleSlug === 'super_admin' || matrixActiveRoleSlug === 'owner') && perm.slug === 'can_manage_roles';
                                                                return (
                                                                    <div
                                                                        key={perm.slug}
                                                                        style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            padding: '12px 16px',
                                                                            borderRadius: '8px',
                                                                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                                                            border: '1px solid var(--color-interface-outline)',
                                                                            transition: 'background-color 0.2s'
                                                                        }}
                                                                    >
                                                                        <div style={{ paddingRight: '16px' }}>
                                                                            <code style={{ fontSize: '12px', color: 'var(--color-status-success)' }}>
                                                                                {perm.slug}
                                                                            </code>
                                                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.7 }}>
                                                                                {perm.description}
                                                                            </p>
                                                                        </div>
                                                                        <ToggleSwitch
                                                                            checked={isChecked}
                                                                            disabled={isLocked}
                                                                            onChange={() => handleTogglePermission(matrixActiveRoleSlug, perm.slug)}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.5 }}>
                                        Select a role from the sidebar to configure permissions.
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Modal: Edit Role Details */}
            <Modal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                title="Edit Role Details"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsRoleModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveRole}>Save Details</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className={adminStyles.label}>Role Display Name</label>
                        <input
                            className={adminStyles.input}
                            value={roleForm.display_name}
                            onChange={e => setRoleForm({ ...roleForm, display_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={adminStyles.label}>Role Description</label>
                        <textarea
                            className={adminStyles.input}
                            style={{ width: '100%', minHeight: '80px', fontFamily: 'inherit', padding: '8px' }}
                            value={roleForm.description}
                            onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal: Assign/Revoke Permission for Role */}
            <Modal
                isOpen={isAssignPermModalOpen}
                onClose={() => setIsAssignPermModalOpen(false)}
                title="Manage Role Permission Assignment"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsAssignPermModalOpen(false)}>
                            Cancel
                        </button>
                        {targetRoleSlug && rolePermissions[targetRoleSlug]?.has(selectedPerm?.slug || '') ? (
                            <button 
                                className={adminStyles.btnSecondary} 
                                style={{ borderColor: 'var(--color-status-error)', color: 'var(--color-status-error)' }}
                                onClick={() => handlePermissionRoleAction('revoke')}
                            >
                                Revoke from Role
                            </button>
                        ) : (
                            <button 
                                className={adminStyles.btnPrimary} 
                                onClick={() => handlePermissionRoleAction('assign')}
                            >
                                Assign to Role
                            </button>
                        )}
                    </>
                }
            >
                {selectedPerm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: 600 }}>Permission Slug</span>
                            <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                {selectedPerm.slug}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: 600 }}>Description</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                                {selectedPerm.description}
                            </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--color-interface-outline)', paddingTop: '16px' }}>
                            <label className={adminStyles.label} style={{ marginBottom: '8px', display: 'block' }}>Target Role</label>
                            <select
                                className={adminStyles.input}
                                style={{ width: '100%', padding: '10px', background: 'var(--color-background-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                value={targetRoleSlug}
                                onChange={e => setTargetRoleSlug(e.target.value)}
                            >
                                {roles.map(r => (
                                    <option key={r.id} value={r.role_slug}>
                                        {r.display_name} ({r.role_slug})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--color-interface-outline)' }}>
                            <div style={{
                                width: '10px', 
                                height: '10px', 
                                borderRadius: '50%', 
                                backgroundColor: targetRoleSlug && rolePermissions[targetRoleSlug]?.has(selectedPerm.slug) ? 'var(--color-status-success)' : 'rgba(255, 255, 255, 0.2)'
                            }} />
                            <span style={{ fontSize: '13px', opacity: 0.8 }}>
                                {targetRoleSlug && rolePermissions[targetRoleSlug]?.has(selectedPerm.slug) ? (
                                    <>Role <strong>{targetRoleSlug}</strong> currently has this permission.</>
                                ) : (
                                    <>Role <strong>{targetRoleSlug}</strong> does not have this permission.</>
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default function IAMPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading IAM Center...</div>}>
            <IAMContent />
        </Suspense>
    );
}
