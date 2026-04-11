"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/utils/format';
import PageHeader from '@/components/dashboard/PageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';

interface SubscriptionPlan {
    id: string;
    display_name: string;
    description: string | null;
    product_type: string;
    interval: string;
    is_active: boolean;
    metadata: Record<string, any>;
    created_at: string;
    subscription_prices: SubscriptionPrice[];
}

interface SubscriptionPrice {
    id: string;
    plan_id: string;
    country_code: string | null;
    currency: string | null;
    amount: number;
    external_gateway_id: string | null;
    is_active: boolean;
}

export default function SubscriptionPlansPage() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Plan modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [planId, setPlanId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [productType, setProductType] = useState('attendee_premium');
    const [interval, setInterval] = useState('month');
    const [isActive, setIsActive] = useState(true);
    const [features, setFeatures] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Price modal
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [pricePlanId, setPricePlanId] = useState('');
    const [priceCurrency, setPriceCurrency] = useState('KES');
    const [priceAmount, setPriceAmount] = useState('');
    const [priceCountryCode, setPriceCountryCode] = useState('');
    const [priceGatewayId, setPriceGatewayId] = useState('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    const fetchPlans = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*, subscription_prices(*)')
                .order('created_at');

            if (error) throw error;
            setPlans(data || []);
        } catch (e: any) {
            showToast('Failed to load subscription plans', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const openCreate = () => {
        setEditingPlan(null);
        setPlanId('');
        setDisplayName('');
        setDescription('');
        setProductType('attendee_premium');
        setInterval('month');
        setIsActive(true);
        setFeatures('');
        setIsModalOpen(true);
    };

    const openEdit = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setPlanId(plan.id);
        setDisplayName(plan.display_name);
        setDescription(plan.description || '');
        setProductType(plan.product_type);
        setInterval(plan.interval);
        setIsActive(plan.is_active);
        setFeatures((plan.metadata?.features || []).join('\n'));
        setIsModalOpen(true);
    };

    const handleSavePlan = async () => {
        if (!planId.trim() || !displayName.trim()) {
            showToast('Plan ID and display name are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: planId.trim(),
                display_name: displayName.trim(),
                description: description.trim() || null,
                product_type: productType,
                interval,
                is_active: isActive,
                metadata: {
                    features: features.split('\n').map(f => f.trim()).filter(Boolean),
                },
            };

            if (editingPlan) {
                const { id: _, ...updatePayload } = payload;
                const { error } = await supabase
                    .from('subscription_plans')
                    .update(updatePayload)
                    .eq('id', editingPlan.id);
                if (error) throw error;
                showToast('Plan updated', 'success');
            } else {
                const { error } = await supabase
                    .from('subscription_plans')
                    .insert(payload);
                if (error) throw error;
                showToast('Plan created', 'success');
            }

            setIsModalOpen(false);
            fetchPlans();
        } catch (e: any) {
            showToast(e.message || 'Failed to save plan', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const openAddPrice = (forPlanId: string) => {
        setPricePlanId(forPlanId);
        setPriceCurrency('KES');
        setPriceAmount('');
        setPriceCountryCode('');
        setPriceGatewayId('');
        setIsPriceModalOpen(true);
    };

    const handleSavePrice = async () => {
        const numAmount = parseFloat(priceAmount);
        if (!numAmount || numAmount < 0) {
            showToast('Enter a valid price amount', 'error');
            return;
        }

        setIsSavingPrice(true);
        try {
            const { error } = await supabase
                .from('subscription_prices')
                .insert({
                    plan_id: pricePlanId,
                    currency: priceCurrency || null,
                    amount: numAmount,
                    country_code: priceCountryCode.trim() || null,
                    external_gateway_id: priceGatewayId.trim() || null,
                });

            if (error) throw error;
            showToast('Price added', 'success');
            setIsPriceModalOpen(false);
            fetchPlans();
        } catch (e: any) {
            showToast(e.message || 'Failed to add price', 'error');
        } finally {
            setIsSavingPrice(false);
        }
    };

    const handleDeletePrice = async (priceId: string) => {
        if (!confirm('Delete this price tier?')) return;
        try {
            const { error } = await supabase
                .from('subscription_prices')
                .delete()
                .eq('id', priceId);
            if (error) throw error;
            showToast('Price deleted', 'success');
            fetchPlans();
        } catch (e: any) {
            showToast('Failed to delete price', 'error');
        }
    };

    const togglePlanActive = async (plan: SubscriptionPlan) => {
        try {
            const { error } = await supabase
                .from('subscription_plans')
                .update({ is_active: !plan.is_active })
                .eq('id', plan.id);
            if (error) throw error;
            showToast(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`, 'success');
            fetchPlans();
        } catch (e: any) {
            showToast('Failed to update plan', 'error');
        }
    };

    return (
        <div className={adminStyles.page}>
            <PageHeader
                title="Subscription Plans"
                subtitle="Manage subscription plans and pricing tiers"
                action={{ label: '+ Create Plan', onClick: openCreate }}
            />

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : plans.length === 0 ? (
                <div className={adminStyles.emptyState}>
                    <p>No subscription plans configured yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {plans.map(plan => (
                        <div key={plan.id} className={adminStyles.card} style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{plan.display_name}</h3>
                                        <Badge variant={plan.is_active ? 'success' : 'neutral'}>
                                            {plan.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                                        ID: {plan.id} · {plan.product_type} · {plan.interval}
                                    </p>
                                    {plan.description && (
                                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                                            {plan.description}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={adminStyles.secondaryButton} onClick={() => openEdit(plan)} style={{ fontSize: 13, padding: '6px 12px' }}>
                                        Edit
                                    </button>
                                    <button
                                        className={plan.is_active ? adminStyles.dangerButton : adminStyles.primaryButton}
                                        onClick={() => togglePlanActive(plan)}
                                        style={{ fontSize: 13, padding: '6px 12px' }}
                                    >
                                        {plan.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>

                            {/* Features */}
                            {plan.metadata?.features?.length > 0 && (
                                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {plan.metadata.features.map((f: string, i: number) => (
                                        <span key={i} style={{ fontSize: 12, padding: '2px 8px', background: 'var(--color-bg-subtle)', borderRadius: 4 }}>
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Prices */}
                            <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                        Pricing ({plan.subscription_prices.length})
                                    </p>
                                    <button
                                        className={adminStyles.secondaryButton}
                                        onClick={() => openAddPrice(plan.id)}
                                        style={{ fontSize: 12, padding: '4px 10px' }}
                                    >
                                        + Add Price
                                    </button>
                                </div>
                                {plan.subscription_prices.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>No prices configured</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                                        {plan.subscription_prices.map(price => (
                                            <div key={price.id} style={{ padding: 12, background: 'var(--color-bg-subtle)', borderRadius: 8, fontSize: 13 }}>
                                                <p style={{ margin: 0, fontWeight: 600 }}>
                                                    {price.currency} {price.amount}
                                                </p>
                                                {price.country_code && (
                                                    <p style={{ margin: '2px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                                                        Region: {price.country_code}
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => handleDeletePrice(price.id)}
                                                    style={{ marginTop: 6, fontSize: 11, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Plan Modal */}
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)} title={editingPlan ? 'Edit Plan' : 'Create Plan'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label className={adminStyles.fieldLabel}>
                            Plan ID *
                            <input
                                className={adminStyles.input}
                                value={planId}
                                onChange={e => setPlanId(e.target.value)}
                                placeholder="e.g. premium, pro_monthly"
                                disabled={!!editingPlan}
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            Display Name *
                            <input
                                className={adminStyles.input}
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="e.g. Premium Plan"
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            Description
                            <textarea
                                className={adminStyles.textarea}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief plan description"
                            />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Product Type
                                <select className={adminStyles.select} value={productType} onChange={e => setProductType(e.target.value)}>
                                    <option value="attendee_premium">Attendee Premium</option>
                                    <option value="organizer_pro">Organizer Pro</option>
                                    <option value="advertiser_boost">Advertiser Boost</option>
                                    <option value="pulse_music">Pulse Music</option>
                                </select>
                            </label>
                            <label className={adminStyles.fieldLabel}>
                                Billing Interval
                                <select className={adminStyles.select} value={interval} onChange={e => setInterval(e.target.value)}>
                                    <option value="month">Monthly</option>
                                    <option value="year">Yearly</option>
                                </select>
                            </label>
                        </div>
                        <label className={adminStyles.fieldLabel}>
                            Features (one per line)
                            <textarea
                                className={adminStyles.textarea}
                                value={features}
                                onChange={e => setFeatures(e.target.value)}
                                rows={4}
                                placeholder={"Priority support\nExclusive content\nAd-free experience"}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                            Active
                        </label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className={adminStyles.primaryButton} onClick={handleSavePlan} disabled={isSaving}>
                                {isSaving ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Price Modal */}
            {isPriceModalOpen && (
                <Modal onClose={() => setIsPriceModalOpen(false)} title="Add Price Tier">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Currency *
                                <select className={adminStyles.select} value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                                    <option value="KES">KES</option>
                                    <option value="NGN">NGN</option>
                                    <option value="USD">USD</option>
                                    <option value="GBP">GBP</option>
                                    <option value="ZAR">ZAR</option>
                                </select>
                            </label>
                            <label className={adminStyles.fieldLabel}>
                                Amount *
                                <input
                                    className={adminStyles.input}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={priceAmount}
                                    onChange={e => setPriceAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </label>
                        </div>
                        <label className={adminStyles.fieldLabel}>
                            Country Code (optional)
                            <input
                                className={adminStyles.input}
                                value={priceCountryCode}
                                onChange={e => setPriceCountryCode(e.target.value)}
                                placeholder="e.g. KE, NG (leave blank for global)"
                                maxLength={2}
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            External Gateway ID (optional)
                            <input
                                className={adminStyles.input}
                                value={priceGatewayId}
                                onChange={e => setPriceGatewayId(e.target.value)}
                                placeholder="e.g. Paystack plan ID"
                            />
                        </label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsPriceModalOpen(false)}>Cancel</button>
                            <button className={adminStyles.primaryButton} onClick={handleSavePrice} disabled={isSavingPrice}>
                                {isSavingPrice ? 'Adding...' : 'Add Price'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
