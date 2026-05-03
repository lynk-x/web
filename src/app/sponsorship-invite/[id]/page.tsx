"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/ui/Toast';
import styles from './SponsorshipInvite.module.css';

interface InvitationData {
    id: string;
    event: {
        id: string;
        title: string;
        starts_at: string;
        info: any;
    };
    tier: {
        id: string;
        name: string;
        price: number;
        currency: string;
        share_of_voice: number;
        is_exclusive: boolean;
        target_placements: string[];
        benefits: string[];
    };
    status: string;
    expires_at: string;
}

export default function SponsorshipInvitePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [data, setData] = useState<InvitationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        async function fetchInvitation() {
            if (!id) return;
            try {
                const { data: inv, error } = await supabase
                    .from('sponsorship_invitations')
                    .select('*, event:events(*), tier:sponsorship_tiers(*)')
                    .eq('id', id)
                    .single();

                if (error || !inv) throw new Error('Invitation not found');
                
                if (inv.status !== 'pending') {
                    showToast(`This invitation has already been ${inv.status}`, 'info');
                }

                setData(inv as any);
            } catch (err: unknown) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchInvitation();
    }, [id, supabase, showToast]);

    const handleAccept = async () => {
        if (!data) return;
        setIsProcessing(true);
        try {
            // In a real flow, this would redirect to /checkout/sponsorship/[id]
            // For this design demo, we simulate the path to payment
            showToast('Redirecting to secure payment portal...', 'success');
            
            // Artificial delay for premium feel
            setTimeout(() => {
                router.push(`/checkout/sponsorship/${data.id}`);
            }, 1500);
        } catch (err) {
            showToast('Failed to process. Please try again.', 'error');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
                <p>Preparing brand proposal...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className={styles.error}>
                <h1 className={styles.errorTitle}>Invite Not Found</h1>
                <p className={styles.errorText}>This sponsorship invitation may have expired or been revoked.</p>
                <button className="secondaryButton" onClick={() => router.push('/')}>Return Home</button>
            </div>
        );
    }

    const { event, tier } = data;

    return (
        <div className={styles.page}>
            {/* Hero Section */}
            <header className={styles.hero}>
                <Image 
                    src="/home/k3nny/.gemini/antigravity/brain/fe72a708-d7c9-453d-9220-9ad3387f5675/sponsorship_hero_banner_1775979395723.png"
                    alt="Sponsorship Hero"
                    width={1920}
                    height={1080}
                    className={styles.heroImage}
                    priority
                />
                <div className={styles.heroOverlay} />
                <div className={styles.heroContent}>
                    <div className={styles.eventSubtitle}>Official Partnership Proposal</div>
                    <h1 className={styles.eventTitle}>{event.title}</h1>
                    <div style={{ marginTop: 24, fontSize: 16, opacity: 0.8 }}>
                        {formatDate(event.starts_at)} · Exclusive Ecosystem Access
                    </div>
                </div>
            </header>

            <main className={styles.mainContent}>
                {/* Left Column: Event Context & Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div className={styles.glassCard}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Audience Engagement Potential</h2>
                        
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>~15k</span>
                                <span className={styles.statLabel}>Est. Impressions</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>4.8%</span>
                                <span className={styles.statLabel}>Engagement Rate</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>100%</span>
                                <span className={styles.statLabel}>Verified Network</span>
                            </div>
                        </div>

                        <p style={{ color: '#aaa', lineHeight: 1.6, fontSize: 14 }}>
                            As a partner of {event.title}, your brand will be integrated directly into the event ecosystem. 
                            Our analytics engine ensures your placements are served only to high-intent attendees within 
                            our 100% verified network.
                        </p>
                    </div>

                    <div className={styles.glassCard}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Ad Placements Included</h2>
                        <div className={styles.placements}>
                            {['banner', 'interstitial', 'interstitial_video'].map(type => (
                                <div 
                                    key={type} 
                                    className={`${styles.placementBadge} ${tier.target_placements.includes(type) ? styles.placementBadgeActive : ''}`}
                                >
                                    {type.replace('_', ' ')}
                                </div>
                            ))}
                        </div>
                        <p style={{ color: '#aaa', fontSize: 14 }}>
                            {tier.is_exclusive 
                                ? "This is an EXCLUSIVE sponsorship. During the event, your brand will own 100% of the share-of-voice for the selected placements."
                                : `This tier provides a ${Math.round(tier.share_of_voice * 100)}% share-of-voice alongside other event partners.`
                            }
                        </p>
                    </div>
                </div>

                {/* Right Column: Pricing & Action */}
                <div style={{ position: 'sticky', top: 32 }}>
                    <div className={styles.glassCard}>
                        <div className={styles.tierSection}>
                            <div className={styles.tierLabel}>Selected Package</div>
                            <h2 className={styles.tierName}>{tier.name}</h2>
                        </div>

                        <div className={styles.priceSection}>
                            <span className={styles.currency}>{tier.currency}</span>
                            <span className={styles.price}>{formatCurrency(tier.price, '').replace(/[^\d]/g, '')}</span>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>One-time sponsorship fee</div>
                        </div>

                        <div className={styles.benefitsList}>
                            {tier.benefits && tier.benefits.length > 0 ? (
                                tier.benefits.map((benefit, i) => (
                                    <div key={i} className={styles.benefit}>
                                        <div className={styles.benefitCheck}>✓</div>
                                        <span>{benefit}</span>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className={styles.benefit}>
                                        <div className={styles.benefitCheck}>✓</div>
                                        <span>Live Forum Banner Ads</span>
                                    </div>
                                    <div className={styles.benefit}>
                                        <div className={styles.benefitCheck}>✓</div>
                                        <span>Verified Brand Representative Badge</span>
                                    </div>
                                    <div className={styles.benefit}>
                                        <div className={styles.benefitCheck}>✓</div>
                                        <span>Priority Support & Monitoring</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {data.status === 'pending' ? (
                            <>
                                <button 
                                    className={styles.actionButton} 
                                    onClick={handleAccept}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : `Accept & Pay Now`}
                                </button>
                                <button className={styles.declineButton}>Decline Proposal</button>
                                <div style={{ fontSize: 11, textAlign: 'center', marginTop: 16, color: '#666' }}>
                                    Offer expires on {formatDate(data.expires_at)}
                                </div>
                            </>
                        ) : (
                            <div className={styles.actionButton} style={{ opacity: 0.5, cursor: 'not-allowed', textAlign: 'center' }}>
                                Invitation {data.status}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
