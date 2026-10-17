"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
    createSponsorshipsRepository,
    createAccountsRepository,
    type ClaimInviteData,
    type AccountMembership,
} from '@/lib/repositories';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/shared/Spinner';
import Modal from '@/components/shared/Modal';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import styles from './claim.module.css';

interface SponsorshipClaimClientProps {
    token: string;
    initialData?: ClaimInviteData | null;
}

/**
 * Interactive client controller for the inbound tokenized sponsorship claim flow ([P7]).
 * Facilitates verification of deliverables, corporate account selection, instant atomic
 * campaign provisioning, and decline feedback submission.
 */
export function SponsorshipClaimClient({ token, initialData }: SponsorshipClaimClientProps) {
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);
    const accountsRepo = useMemo(() => createAccountsRepository(supabase), [supabase]);

    const [inviteData, setInviteData] = useState<ClaimInviteData | null>(initialData ?? null);
    const [isLoading, setIsLoading] = useState<boolean>(!initialData);
    const [accounts, setAccounts] = useState<AccountMembership[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [customCampaignTitle, setCustomCampaignTitle] = useState<string>('');
    const [destinationUrl, setDestinationUrl] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [claimedResult, setClaimedResult] = useState<{
        campaignId: string;
        campaignReference: string;
    } | null>(null);

    // Decline modal state
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
    const [declineReason, setDeclineReason] = useState<string>('');
    const [isDeclining, setIsDeclining] = useState<boolean>(false);

    // Fetch or refresh invite details
    const loadInvite = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await sponsorshipsRepo.getInviteByToken(token);
        setIsLoading(false);

        if (error || !data || !data.found) {
            setInviteData(null);
            return;
        }

        setInviteData(data);
        if (!customCampaignTitle) {
            setCustomCampaignTitle(`${data.company_name} — ${data.event.title} (${data.tier.name})`);
        }
    }, [sponsorshipsRepo, token, customCampaignTitle]);

    useEffect(() => {
        if (!initialData) {
            loadInvite();
        } else if (!customCampaignTitle) {
            setCustomCampaignTitle(`${initialData.company_name} — ${initialData.event.title} (${initialData.tier.name})`);
        }
    }, [loadInvite, initialData, customCampaignTitle]);

    // Fetch user's managed corporate accounts once authenticated
    useEffect(() => {
        if (!user) {
            setAccounts([]);
            return;
        }

        let isMounted = true;
        accountsRepo.getMembershipsForUser(user.id).then(({ data, error }) => {
            if (!isMounted) return;
            if (error || !data) {
                return;
            }
            setAccounts(data);
            if (data.length > 0 && !selectedAccountId) {
                // Default to primary account or first available
                const primary = data.find((a) => a.isPrimary) || data[0];
                setSelectedAccountId(primary.id);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [user, accountsRepo, selectedAccountId]);

    // Format event start/end dates for clear display
    const formattedDateRange = useMemo(() => {
        if (!inviteData?.event?.starts_at) return '';
        try {
            const start = new Date(inviteData.event.starts_at);
            const end = inviteData.event.ends_at ? new Date(inviteData.event.ends_at) : null;
            const startStr = start.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            if (!end) return startStr;
            const endStr = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `${startStr} – ${endStr}`;
        } catch {
            return inviteData.event.starts_at;
        }
    }, [inviteData]);

    // Handle Claim / Acceptance
    const handleAcceptInvite = async () => {
        if (!selectedAccountId) {
            showToast('Please select or create an account to own this sponsorship campaign.', 'error');
            return;
        }

        setIsSubmitting(true);
        const { data, error } = await sponsorshipsRepo.acceptInvite({
            inviteToken: token,
            accountId: selectedAccountId,
            campaignTitle: customCampaignTitle.trim() || undefined,
            destinationUrl: destinationUrl.trim() || undefined,
        });
        setIsSubmitting(false);

        if (error || !data || !data.success) {
            showToast(getErrorMessage(error) || 'Failed to claim sponsorship. Please try again or contact the organizer.', 'error');
            return;
        }

        showToast('Sponsorship successfully accepted and campaign provisioned!', 'success');

        setClaimedResult({
            campaignId: data.campaign_id,
            campaignReference: data.campaign_reference,
        });
    };

    // Handle Decline
    const handleDeclineInvite = async () => {
        setIsDeclining(true);
        const { error } = await sponsorshipsRepo.declineInvite(token, declineReason.trim() || undefined);
        setIsDeclining(false);

        if (error) {
            showToast(getErrorMessage(error) || 'Failed to decline invitation.', 'error');
            return;
        }

        showToast('You have declined this sponsorship invitation. The organizer has been notified.', 'info');
        setIsDeclineModalOpen(false);
        loadInvite();
    };

    if (isLoading || isAuthLoading) {
        return (
            <div className={styles.pageContainer}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
                    <Spinner size={32} />
                    <p style={{ color: 'var(--color-utility-secondaryText, #9ca3af)', fontSize: 14 }}>
                        Loading sponsorship invitation details...
                    </p>
                </div>
            </div>
        );
    }

    if (!inviteData) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentWrapper}>
                    <header className={styles.headerNav}>
                        <Link href="/" className={styles.brandLogo} id="brand-logo-link">
                            <span>LYNK-X</span>
                            <span className={styles.brandPill}>Sponsorships</span>
                        </Link>
                    </header>
                    <div className={styles.alertCard}>
                        <div className={styles.alertIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h2 className={styles.alertTitle}>Invitation Link Invalid or Expired</h2>
                        <p className={styles.alertMessage}>
                            This sponsorship invitation link could not be located. The link may have been entered incorrectly or cancelled by the event organizer.
                        </p>
                        <Link href="/" className={styles.primaryButton} style={{ maxWidth: 220, marginTop: 12 }}>
                            Explore Events
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { event, tier, status, is_expired, company_name, effective_price, currency, expires_at } = inviteData;
    const isPending = status === 'pending' && !is_expired;
    const perks = tier?.perks || {};
    const sovPercent = Math.round(Number(perks.share_of_voice ?? 1.0) * 100);
    const ticketPasses = Number(perks.ticket_passes ?? 0);
    const questSlots = Number(perks.quest_slots ?? 0);
    const formats = (perks.formats as string[]) || ['banner'];

    // Display Confirmed Success Screen
    if (claimedResult) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentWrapper}>
                    <header className={styles.headerNav}>
                        <Link href="/" className={styles.brandLogo}>
                            <span>LYNK-X</span>
                            <span className={styles.brandPill}>Sponsorships</span>
                        </Link>
                    </header>
                    <div className={styles.successContainer}>
                        <div className={styles.successIconBadge}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <div>
                            <h1 className={styles.eventTitle} style={{ fontSize: 32, marginBottom: 8 }}>
                                Sponsorship Confirmed!
                            </h1>
                            <p style={{ color: 'var(--color-utility-secondaryText, #9ca3af)', fontSize: 15, margin: 0 }}>
                                Your sponsorship package for <strong>{event.title}</strong> has been contracted and reserved.
                            </p>
                        </div>

                        <div className={styles.campaignRefBox}>
                            <span style={{ color: 'var(--color-utility-secondaryText, #9ca3af)' }}>Contract Ref:</span>
                            <strong style={{ color: 'var(--color-brand-primary, #20f928)' }}>{claimedResult.campaignReference}</strong>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button
                                type="button"
                                id="btn-goto-campaign"
                                className={styles.primaryButton}
                                onClick={() => router.push(`/dashboard/advertiser/campaigns`)}
                            >
                                <span>Go to Campaign Hub</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                {/* Navigation Bar */}
                <header className={styles.headerNav}>
                    <Link href="/" className={styles.brandLogo} id="nav-brand-logo">
                        <span>LYNK-X</span>
                        <span className={styles.brandPill}>Direct Sponsor Invite</span>
                    </Link>
                    <div className={styles.userStatus}>
                        {user ? (
                            <span>Signed in as <strong>{user.email}</strong></span>
                        ) : (
                            <Link
                                href={`/auth/login?returnUrl=${encodeURIComponent(`/sponsorships/claim/${token}`)}`}
                                className={styles.authLink}
                                id="nav-signin-link"
                            >
                                Sign In / Register
                            </Link>
                        )}
                    </div>
                </header>

                {/* Event Hero Showcase */}
                <section className={styles.eventHero} aria-labelledby="event-title-heading">
                    <div className={styles.heroImageContainer}>
                        {/* Event cover or default dark backdrop */}
                        {event.media?.hero || event.media?.poster ? (
                            <img
                                src={String(event.media.hero || event.media.poster)}
                                alt={event.title}
                                className={styles.heroImage}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #18202e 0%, #0e1219 100%)' }} />
                        )}
                        <div className={styles.heroGradient} />

                        <div className={styles.heroBadgeBar}>
                            <span className={styles.inviteTag}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                Exclusive Invitation for {company_name}
                            </span>

                            <span className={`${styles.statusPill} ${
                                isPending ? styles.statusPending :
                                status === 'accepted' ? styles.statusAccepted :
                                is_expired ? styles.statusExpired : styles.statusRevoked
                            }`}>
                                {is_expired ? 'Expired' : status}
                            </span>
                        </div>
                    </div>

                    <div className={styles.heroContent}>
                        <h1 id="event-title-heading" className={styles.eventTitle}>{event.title}</h1>
                        <div className={styles.eventMetaRow}>
                            {formattedDateRange && (
                                <span className={styles.metaItem}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    {formattedDateRange}
                                </span>
                            )}
                            {event.location?.venue ? (
                                <span className={styles.metaItem}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {String(event.location.venue)}
                                </span>
                            ) : event.is_online ? (
                                <span className={styles.metaItem}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                    </svg>
                                    Online Virtual Event
                                </span>
                            ) : null}

                            {event.total_capacity > 0 && (
                                <span className={styles.metaItem}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    {event.total_capacity.toLocaleString()} Expected Attendees
                                </span>
                            )}

                            <span className={styles.organizerBadge}>
                                {event.organizer_logo && (
                                    <img src={event.organizer_logo} alt="" className={styles.organizerLogo} />
                                )}
                                By {event.organizer_name}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Non-Pending Status Banner Warnings */}
                {!isPending && (
                    <div className={styles.alertCard} style={{ background: '#1c1719', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <div className={styles.alertIcon} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h3 className={styles.alertTitle}>
                            {status === 'accepted' ? 'Invitation Already Claimed' :
                             status === 'declined' ? 'Invitation Declined' :
                             status === 'revoked' ? 'Invitation Revoked' : 'Invitation Expired'}
                        </h3>
                        <p className={styles.alertMessage}>
                            {status === 'accepted' ? 'This sponsorship tier has already been contracted and provisioned.' :
                             status === 'declined' ? 'You or a team member previously declined this private sponsorship offer.' :
                             status === 'revoked' ? 'The event organizer has retracted this invitation link.' :
                             'The 14-day validity window for this private direct quote has expired. Contact the organizer to request an updated quote.'}
                        </p>
                    </div>
                )}

                {/* Main Content Grid: Deliverables Specification & Contract Action */}
                <div className={styles.mainGrid}>
                    {/* Left Column: Deliverables Specification */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>
                                <span>{tier.name} Package</span>
                                <span className={styles.tierRankBadge}>Rank #{tier.rank}</span>
                            </h2>
                            <span style={{ fontSize: 13, color: 'var(--color-utility-secondaryText, #9ca3af)' }}>
                                {tier.available_slots} of {tier.max_slots} slot{tier.max_slots === 1 ? '' : 's'} available
                            </span>
                        </div>

                        {/* Deliverables Breakdown Cards */}
                        <div className={styles.deliverablesList}>
                            {/* Share of Voice */}
                            <div className={styles.deliverableItem}>
                                <div className={styles.deliverableTop}>
                                    <span className={styles.deliverableLabel}>Share of Voice (SOV)</span>
                                    <div className={styles.deliverableIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        </svg>
                                    </div>
                                </div>
                                <div className={styles.deliverableValue}>{sovPercent}%</div>
                                <div className={styles.sovMeterTrack}>
                                    <div className={styles.sovMeterFill} style={{ width: `${sovPercent}%` }} />
                                </div>
                                <span className={styles.deliverableDesc}>
                                    Guaranteed impression weight across event forums, media streams, and live check-in hubs.
                                </span>
                            </div>

                            {/* Complimentary Ticket Passes */}
                            <div className={styles.deliverableItem}>
                                <div className={styles.deliverableTop}>
                                    <span className={styles.deliverableLabel}>VIP Passes</span>
                                    <div className={styles.deliverableIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <line x1="2" y1="10" x2="22" y2="10" />
                                        </svg>
                                    </div>
                                </div>
                                <div className={styles.deliverableValue}>{ticketPasses} Passes</div>
                                <span className={styles.deliverableDesc}>
                                    Complimentary digital attendee passes with instant QR check-in credentials for your company team.
                                </span>
                            </div>

                            {/* Interactive Quest Real Estate */}
                            <div className={styles.deliverableItem}>
                                <div className={styles.deliverableTop}>
                                    <span className={styles.deliverableLabel}>Brand Quest Challenges</span>
                                    <div className={styles.deliverableIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="8" r="7" />
                                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                        </svg>
                                    </div>
                                </div>
                                <div className={styles.deliverableValue}>{questSlots} Active Slots</div>
                                <span className={styles.deliverableDesc}>
                                    Interactive brand engagement quests rewarding attendees for booth visits and survey completions.
                                </span>
                            </div>

                            {/* Inventory Capacity */}
                            <div className={styles.deliverableItem}>
                                <div className={styles.deliverableTop}>
                                    <span className={styles.deliverableLabel}>Exclusivity Cap</span>
                                    <div className={styles.deliverableIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                </div>
                                <div className={styles.deliverableValue}>Max {tier.max_slots} Partner{tier.max_slots === 1 ? '' : 's'}</div>
                                <span className={styles.deliverableDesc}>
                                    Strict slot cap ensures your brand is not diluted by an over-crowded sponsor tier.
                                </span>
                            </div>
                        </div>

                        {/* Competitor Ad Shield Guarantee */}
                        <div className={styles.shieldBanner}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <div>
                                <strong>Competitor Brand Exclusivity Shield</strong>
                                Once contracted, the Lynk-X ad auction engine activates an in-feed competitor shield across this event, blocking third-party network ads from competing brands in the same category.
                            </div>
                        </div>

                        {/* Supported Ad Formats */}
                        <div className={styles.formatsSection}>
                            <div className={styles.sectionSubtitle}>Included Media Assets & Surfaces</div>
                            <div className={styles.formatsTags}>
                                {formats.map((fmt) => (
                                    <span key={fmt} className={styles.formatTag}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                            <line x1="8" y1="21" x2="16" y2="21" />
                                            <line x1="12" y1="17" x2="12" y2="21" />
                                        </svg>
                                        {fmt === 'banner' ? 'Forum In-Feed Banners' :
                                         fmt === 'interstitial' ? 'Interstitial Visual Takeover' :
                                         fmt === 'interstitial_video' ? 'Autoplaying Video Spot' :
                                         fmt.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing & Contract Claim Form */}
                    <aside className={styles.actionCard} aria-labelledby="claim-sidebar-heading">
                        <div className={styles.priceDisplay}>
                            <div className={styles.priceLabel}>
                                <span>Investment Quote</span>
                                {inviteData.custom_price !== null && (
                                    <span className={styles.customQuoteTag}>Custom Agreed Quote</span>
                                )}
                            </div>
                            <div className={styles.priceAmount}>
                                {formatCurrency(effective_price, currency)}
                                {inviteData.custom_price !== null && inviteData.custom_price !== tier.catalog_price && (
                                    <span className={styles.catalogStrikethrough}>
                                        {formatCurrency(tier.catalog_price, currency)}
                                    </span>
                                )}
                            </div>
                            <div className={styles.expiryNotice}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span>Valid until {new Date(expires_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Authentication Gate / Account Form */}
                        {isPending && (
                            <>
                                {!user ? (
                                    <div className={styles.authGateNotice}>
                                        <p style={{ margin: 0 }}>
                                            To accept and manage this sponsorship, please authenticate with your Lynk-X corporate credentials.
                                        </p>
                                        <Link
                                            href={`/auth/login?returnUrl=${encodeURIComponent(`/sponsorships/claim/${token}`)}`}
                                            className={styles.primaryButton}
                                            id="btn-auth-signin"
                                        >
                                            Sign In to Contract Sponsorship
                                        </Link>
                                    </div>
                                ) : (
                                    <div className={styles.formGroup}>
                                        {/* Account Picker */}
                                        <div className={styles.field}>
                                            <label htmlFor="account-select" className={styles.fieldLabel}>
                                                Contracting Business Account *
                                            </label>
                                            {accounts.length > 0 ? (
                                                <select
                                                    id="account-select"
                                                    className={styles.select}
                                                    value={selectedAccountId}
                                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                                >
                                                    {accounts.map((acc) => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.name} ({acc.role})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: 12, color: '#f87171' }}>
                                                    No organizational accounts found. Please ensure your account has advertiser permissions.
                                                </div>
                                            )}
                                            <span className={styles.fieldHint}>
                                                The campaign and in-app analytics will be bound to this account.
                                            </span>
                                        </div>

                                        {/* Campaign Title */}
                                        <div className={styles.field}>
                                            <label htmlFor="campaign-title-input" className={styles.fieldLabel}>
                                                Campaign Title
                                            </label>
                                            <input
                                                id="campaign-title-input"
                                                type="text"
                                                className={styles.input}
                                                value={customCampaignTitle}
                                                onChange={(e) => setCustomCampaignTitle(e.target.value)}
                                                placeholder={`${company_name} — ${event.title}`}
                                            />
                                        </div>

                                        {/* Click-Through URL */}
                                        <div className={styles.field}>
                                            <label htmlFor="destination-url-input" className={styles.fieldLabel}>
                                                Destination URL (Optional)
                                            </label>
                                            <input
                                                id="destination-url-input"
                                                type="url"
                                                className={styles.input}
                                                value={destinationUrl}
                                                onChange={(e) => setDestinationUrl(e.target.value)}
                                                placeholder="https://yourbrand.com/special-offer"
                                            />
                                            <span className={styles.fieldHint}>
                                                Target URL when attendees click your in-feed banners or quests.
                                            </span>
                                        </div>

                                        {/* Submission Actions */}
                                        <div className={styles.buttonGroup}>
                                            <button
                                                type="button"
                                                id="btn-accept-sponsorship"
                                                className={styles.primaryButton}
                                                onClick={handleAcceptInvite}
                                                disabled={isSubmitting || !selectedAccountId}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Spinner size={16} />
                                                        <span>Provisioning Campaign...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Accept & Lock In Slot</span>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                id="btn-decline-sponsorship"
                                                className={styles.secondaryButton}
                                                onClick={() => setIsDeclineModalOpen(true)}
                                                disabled={isSubmitting}
                                            >
                                                Decline Invitation
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Inactive Notice */}
                        {!isPending && (
                            <div className={styles.buttonGroup}>
                                <Link href="/" className={styles.secondaryButton}>
                                    Return to Home
                                </Link>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* Decline Feedback Modal */}
            <Modal
                isOpen={isDeclineModalOpen}
                onClose={() => setIsDeclineModalOpen(false)}
                title="Decline Sponsorship Invitation"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ color: 'var(--color-utility-secondaryText, #9ca3af)', fontSize: 13, margin: 0 }}>
                        Are you sure you want to decline the <strong>{tier.name}</strong> sponsorship offer for <strong>{event.title}</strong>? You can optionally share a note with the event organizer.
                    </p>

                    <div className={styles.field}>
                        <label htmlFor="decline-reason" className={styles.fieldLabel}>
                            Reason for Declining (Optional)
                        </label>
                        <textarea
                            id="decline-reason"
                            rows={3}
                            className={styles.textarea}
                            placeholder="e.g. Budget already committed for this quarter, scheduling conflicts..."
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            style={{ width: 'auto' }}
                            onClick={() => setIsDeclineModalOpen(false)}
                            disabled={isDeclining}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            id="btn-confirm-decline"
                            className={styles.primaryButton}
                            style={{ width: 'auto', background: '#ef4444', color: '#fff' }}
                            onClick={handleDeclineInvite}
                            disabled={isDeclining}
                        >
                            {isDeclining ? (
                                <>
                                    <Spinner size={14} />
                                    <span>Declining...</span>
                                </>
                            ) : (
                                'Confirm Decline'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
