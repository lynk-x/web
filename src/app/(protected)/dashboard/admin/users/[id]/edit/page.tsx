"use client";

import React, { use, useState, useEffect, useMemo } from 'react';
import UserForm, { UserFormData } from '@/components/admin/users/UserForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    
    const [user, setUser] = useState<UserFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('user_profile')
                    .select('id, full_name, user_name, email, role, status, bio, country_code, kyc_tier')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                setUser({
                    id: data.id,
                    name: data.full_name,
                    email: data.email,
                    role: data.role as any,
                    status: data.status as any,
                    countryCode: data.country_code,
                    kycTier: data.kyc_tier as any,
                    bio: data.bio
                });
            } catch (err: unknown) {
                showToast('Failed to load user data.', 'error');
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

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Edit Account"
                subtitle={`Updating account details for ${user.name}.`}
                backLabel="Back to Identity"
                isDirty={isDirty}
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
