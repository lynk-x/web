"use client";

import UserForm from '@/components/admin/users/UserForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { useState } from 'react';

export default function CreateUserPage() {
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create New Account"
                subtitle="Add a new member to the platform."
                backLabel="Back to Identity"
                isDirty={isDirty}
                primaryAction={{
                    label: 'Create Account',
                    formId: 'user-form',
                    type: 'submit',
                    isLoading: isSubmitting
                }}
            />
            <UserForm 
                formId="user-form" 
                hideActions={true} 
                onDirtyChange={setIsDirty}
                onSubmittingChange={setIsSubmitting}
            />
        </div>
    );
}
