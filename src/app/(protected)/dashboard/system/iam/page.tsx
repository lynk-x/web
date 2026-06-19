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
import { useDebounce } from '@/hooks/useDebounce';

interface AdminUser {
    user_id: string;
    full_name: string;
    user_name: string;
    email: string;
    role_slug: string;
    joined_at: string;
}

interface AccountRole {
    id: string;
    role_slug: string;
    display_name: string;
    description: string;
}

interface AccountPermission {
    slug: string;
    category: string;
    description: string;
}

function IAMContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Default schema client for standard tables
    const supabase = useMemo(() => createClient(), []);

    // Custom API schema client for IAM RPCs
    const supabaseApi = useMemo(() => createClient('api'), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'users');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    // States
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [roles, setRoles] = useState<AccountRole[]>([]);
    const [permissions, setPermissions] = useState<AccountPermission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<{ [roleSlug: string]: Set<string> }>({});
    
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

    // Modals
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role_slug: 'admin'
    });

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccountRole | null>(null);
    const [roleForm, setRoleForm] = useState({
        display_name: '',
        description: ''
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Load directory of platform admin users
    const fetchAdminUsers = useCallback(async () => {
        try {
            const { data, error } = await supabaseApi.rpc('get_system_admin_users');
            if (error) throw error;
            setAdminUsers(data || []);
        } catch (error) {
            console.error('Error fetching admin users:', error);
            showToast(getErrorMessage(error) || 'Failed to load system administrators', 'error');
        }
    }, [supabaseApi, showToast]);

    // Load global roles and permissions matrix
    const fetchIAMData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch active admin users
            await fetchAdminUsers();

            // Fetch Roles
            const { data: rolesData, error: rolesError } = await supabase
                .from('account_roles')
                .select('*')
                .order('display_name');
            if (rolesError) throw rolesError;
            setRoles(rolesData || []);

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
    }, [supabase, fetchAdminUsers, showToast]);

    useEffect(() => {
        fetchIAMData();
    }, [fetchIAMData]);

    // Invite new Admin
    const handleInviteAdmin = async () => {
        if (!inviteForm.email) {
            showToast('Email is required', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabaseApi.rpc('assign_system_admin_role', {
                p_email: inviteForm.email,
                p_role_slug: inviteForm.role_slug
            });
            if (error) throw error;
            showToast('System administrator added successfully', 'success');
            setIsInviteModalOpen(false);
            setInviteForm({ email: '', role_slug: 'admin' });
            await fetchAdminUsers();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to invite system admin', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Revoke administrative access
    const handleRemoveAdmin = async (userId: string) => {
        if (!confirm('Are you sure you want to revoke administrative access for this user?')) return;
        setIsActionLoading(userId);
        try {
            const { error } = await supabaseApi.rpc('remove_system_admin', {
                p_user_id: userId
            });
            if (error) throw error;
            showToast('Administrative access revoked', 'success');
            await fetchAdminUsers();
        } catch (error) {
            showToast(getErrorMessage(error) || 'Failed to revoke access', 'error');
        } finally {
            setIsActionLoading(null);
        }
    };

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
            const { error } = await supabase
                .from('account_roles')
                .update({
                    display_name: roleForm.display_name,
                    description: roleForm.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingRole.id);
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

    // Filtering users based on search term
    const filteredUsers = useMemo(() => {
        return adminUsers.filter(u => 
            u.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            u.role_slug?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [adminUsers, debouncedSearch]);

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

    // Map adminUsers to have a standard ID property for DataTable
    const mappedAdminUsers = useMemo(() => {
        return filteredUsers.map(u => ({
            ...u,
            id: u.user_id
        }));
    }, [filteredUsers]);

    // Map permissions to have a standard ID property for DataTable
    const mappedPermissions = useMemo(() => {
        return filteredPermissions.map(p => ({
            ...p,
            id: p.slug
        }));
    }, [filteredPermissions]);

    // Columns config for Administrators Table
    const userColumns = useMemo(() => [
        {
            header: 'Administrator',
            render: (user: AdminUser) => (
                <div style={{ fontWeight: 500 }}>
                    {user.full_name || 'N/A'}
                    {user.user_name && (
                        <span style={{ display: 'block', fontSize: '12px', opacity: 0.6 }}>
                            @{user.user_name}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Email',
            render: (user: AdminUser) => user.email
        },
        {
            header: 'Role',
            render: (user: AdminUser) => (
                <span className={adminStyles.badge} style={{ textTransform: 'capitalize' }}>
                    {user.role_slug.replace(/_/g, ' ')}
                </span>
            )
        },
        {
            header: 'Joined At',
            render: (user: AdminUser) => new Date(user.joined_at).toLocaleDateString()
        }
    ], []);

    const getUserActions = useCallback((user: AdminUser) => [
        {
            label: isActionLoading === user.user_id ? 'Revoking...' : 'Revoke Access',
            onClick: () => handleRemoveAdmin(user.user_id),
            disabled: isActionLoading === user.user_id,
            variant: 'danger' as const
        }
    ], [isActionLoading, handleRemoveAdmin]);

    // Columns config for Roles Table
    const roleColumns = useMemo(() => [
        {
            header: 'Role Name',
            render: (role: AccountRole) => (
                <div style={{ fontWeight: 500 }}>{role.display_name}</div>
            )
        },
        {
            header: 'Role Slug',
            render: (role: AccountRole) => <code>{role.role_slug}</code>
        },
        {
            header: 'Description',
            render: (role: AccountRole) => (
                <div style={{ opacity: 0.8, maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {role.description || 'No description provided.'}
                </div>
            )
        }
    ], []);

    const getRoleActions = useCallback((role: AccountRole) => [
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
    ], []);

    // Columns config for Permissions Table
    const permissionColumns = useMemo(() => [
        {
            header: 'Permission Slug',
            render: (perm: AccountPermission) => <code>{perm.slug}</code>
        },
        {
            header: 'Category',
            render: (perm: AccountPermission) => (
                <Badge variant="subtle" label={perm.category.toUpperCase()} />
            )
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

    // Columns config for Permissions Matrix
    const matrixColumns = useMemo(() => {
        const cols = [
            {
                header: 'Permission & Scope',
                render: (perm: AccountPermission) => (
                    <div>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>{perm.slug.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{perm.description}</div>
                    </div>
                ),
                width: '300px'
            },
            {
                header: 'Category',
                render: (perm: AccountPermission) => (
                    <Badge variant="subtle" label={perm.category.toUpperCase()} />
                ),
                width: '150px'
            }
        ];

        roles.forEach(role => {
            cols.push({
                header: role.display_name,
                render: (perm: AccountPermission) => {
                    const isChecked = !!rolePermissions[role.role_slug]?.has(perm.slug);
                    const isLocked = (role.role_slug === 'super_admin' || role.role_slug === 'owner') && perm.slug === 'can_manage_roles';
                    
                    return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLocked}
                                onChange={() => handleTogglePermission(role.role_slug, perm.slug)}
                                style={{ 
                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                    transform: 'scale(1.2)'
                                }}
                            />
                        </div>
                    );
                },
                width: '120px'
            });
        });

        return cols;
    }, [roles, rolePermissions, handleTogglePermission]);

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Identity & Access (IAM)"
                subtitle="Manage platform-level system administrators, global roles and secure access permissions."
            />

            <TableToolbar 
                searchPlaceholder="Search administrators or roles..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="users">Administrators</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                        <TabsTrigger value="matrix">Role</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'users' && (
                            <button className={adminStyles.btnPrimary} onClick={() => setIsInviteModalOpen(true)}>
                                + Invite Administrator
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    {/* Tab 1: Admin Users */}
                    <TabsContent value="users">
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={mappedAdminUsers}
                                columns={userColumns}
                                getActions={getUserActions}
                                isLoading={isLoading}
                                emptyMessage="No administrators found matching the search criteria."
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
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={mappedPermissions}
                                columns={permissionColumns}
                                isLoading={isLoading}
                                emptyMessage="No permissions found."
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 4: Permissions Matrix */}
                    <TabsContent value="matrix">
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={mappedPermissions}
                                columns={matrixColumns}
                                isLoading={isLoading}
                                emptyMessage="No permissions matrix data found."
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Modal: Invite / Add Admin */}
            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                title="Add System Administrator"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsInviteModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleInviteAdmin}>Grant Access</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className={adminStyles.label}>User Email Address</label>
                        <input
                            type="email"
                            className={adminStyles.input}
                            placeholder="e.g. administrator@lynk-x.com"
                            value={inviteForm.email}
                            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        />
                        <span style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px', display: 'block' }}>
                            The user must have an existing profile registered under this email address on the platform.
                        </span>
                    </div>

                    <div>
                        <label className={adminStyles.label}>Administrative Role</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={inviteForm.role_slug}
                            onChange={e => setInviteForm({ ...inviteForm, role_slug: e.target.value })}
                        >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="support_agent">Support Agent</option>
                        </select>
                    </div>
                </div>
            </Modal>

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
