"use client";

import React from 'react';
import PromoCodeForm from '@/components/admin/finance/PromoCodeForm';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

export default function CreatePromoCodePage() {
    return (
        <div className={adminStyles.container}>
            <SubPageHeader 
                title="Create Promo Code"
                subtitle="Configure a new discount code for accounts, events, or ticket tiers."
            />
            <PromoCodeForm isEditing={false} />
        </div>
    );
}
