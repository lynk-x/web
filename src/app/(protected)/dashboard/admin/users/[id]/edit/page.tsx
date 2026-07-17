"use client";

import { getErrorMessage } from '@/utils/error';
import React, { use, useState, useEffect, useMemo } from 'react';
import UserForm, { UserFormData } from '@/components/admin/users/UserForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const { confirm, ConfirmDialog } = useConfirmModal();
    
    const [user, setUser] = useState<UserFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_profiles')
                    .select('id, full_name, user_name, email, phone_number, role, status, bio, country_code, kyc_tier')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                setUser({
                    id: data.id,
                    name: data.full_name,
                    email: data.email,
                    phone: data.phone_number ?? '',
                    role: data.role as any,
                    status: data.status as any,
                    countryCode: data.country_code,
                    kycTier: data.kyc_tier as any,
                    bio: data.bio
                });
            } catch (err: unknown) {
                showToast(getErrorMessage(err) || 'Failed to load user data.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [id, supabase, showToast]);

    if (isLoading) {
        return <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading User Data...</div>;
    }

    if (!user) {
        return <div style={{ padding: '60px', textAlign: 'center' }}>User not found.</div>;
    }

    const handleClose = async () => {
        if (isDirty) {
            const confirmed = await confirm('You have unsaved changes. Are you sure you want to leave?', { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' });
            if (!confirmed) return;
        }
        router.push('/dashboard/admin/users');
    };

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Edit Account"
                subtitle={`Updating account details for ${user.name}.`}
                onClose={handleClose}
                primaryAction={{
                    label: 'Save Changes',
                    formId: 'user-form',
                    type: 'submit',
                    isLoading: isSubmitting
                }}
            />
            <div className={adminStyles.pageCard}>
                <UserForm 
                    formId="user-form"
                    initialData={user} 
                    isEditing 
                    hideActions={true}
                    onDirtyChange={setIsDirty}
                    onSubmittingChange={setIsSubmitting}
                />
            </div>
        </div>
    );
}
