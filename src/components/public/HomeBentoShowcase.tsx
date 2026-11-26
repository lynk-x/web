'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Image as ImageIcon,
    Megaphone,
    Mic,
    MicOff,
    PhoneOff,
    QrCode,
    Radio,
    Search,
    Send,
    Sparkles,
    Users,
    Video,
    Wallet,
} from 'lucide-react';
import styles from './HomeBentoShowcase.module.css';

type ForumTab = 'updates' | 'chat' | 'media';
type HeaderMode = 'search' | 'audio' | 'video';

interface PollOption {
    id: string;
    label: string;
    votes: number;
}

const INITIAL_POLL: PollOption[] = [
    { id: 'fintech', label: 'M-Pesa & Instant Settlements', votes: 64 },
    { id: 'ai', label: 'AI Stage & Live Q&A', votes: 41 },
    { id: 'networking', label: 'Founder Speed Networking', votes: 29 },
];

const SPONSOR_SLIDES = [
    {
        brand: 'Safaricom Hook',
        tagline: 'Instant developer payouts & APIs — Claim free sandbox credits',
        cta: 'Learn more',
    },
    {
        brand: 'Nairobi Cloud Week',
        tagline: '20% off founder passes for Nairobi Tech Summit attendees',
        cta: 'Claim pass',
    },
];

const MEDIA_ITEMS = [
    { id: 'm1', title: 'Main Stage Keynote', tag: 'Photo • 2m ago', tone: 'green' },
    { id: 'm2', title: 'Panel Q&A Highlights', tag: 'Video • 0:42', tone: 'blue' },
    { id: 'm3', title: 'Check-In Lounge', tag: 'Photo • 14m ago', tone: 'amber' },
    { id: 'm4', title: 'Sponsor Booth Demo', tag: 'Photo • 22m ago', tone: 'purple' },
    { id: 'm5', title: 'Soundcheck Clip', tag: 'Video • 0:18', tone: 'teal' },
    { id: 'm6', title: 'VIP Networking', tag: 'Photo • 35m ago', tone: 'emerald' },
];

/**
 * Interactive Bento showcase on the brand homepage pairing a 1-to-1 replica
 * of the Lynk-X PWA event forum with the Organizer Command Stack.
 */
export default function HomeBentoShowcase() {
    const [activeTab, setActiveTab] = useState<ForumTab>('updates');
    const [headerMode, setHeaderMode] = useState<HeaderMode>('search');
    const [isMuted, setIsMuted] = useState(false);
    const [sponsorIdx, setSponsorIdx] = useState(0);
    const [pollOptions, setPollOptions] = useState<PollOption[]>(INITIAL_POLL);
    const [votedOptionId, setVotedOptionId] = useState<string | null>(null);

    const totalVotes = pollOptions.reduce((sum, item) => sum + item.votes, 0);
    const activeSponsor = SPONSOR_SLIDES[sponsorIdx];

    const handleVote = (id: string) => {
        if (votedOptionId === id) return;
        setPollOptions((prev) =>
            prev.map((opt) => {
                if (opt.id === id) return { ...opt, votes: opt.votes + 1 };
                if (opt.id === votedOptionId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
                return opt;
            }),
        );
        setVotedOptionId(id);
    };

    return (
        <section className={styles.bentoSection} aria-labelledby="bento-heading">
            <div className={styles.sectionHeader}>
                <span className={styles.eyebrow}>Inside Every Lynk-X Event</span>
                <h2 id="bento-heading" className={styles.sectionTitle}>
                    One Live Forum. Total Organizer Control.
                </h2>
                <p className={styles.sectionSub}>
                    Explore the exact 3-tab event forum your attendees open in their browser alongside real-time gate check-ins, M-Pesa payouts and sponsor revenue.
                </p>
            </div>

            <div className={styles.bentoGrid}>
                {/* Left Column: 1-to-1 PWA Forum Replica */}
                <div className={styles.forumFrame} aria-label="Interactive Lynk-X Event Forum preview">
                    <div className={styles.forumTopMeta}>
                        <span className={styles.replicaBadge}>Live Forum Preview</span>
                        <div className={styles.headerModeSwitcher} role="group" aria-label="Preview header state">
                            <button
                                type="button"
                                className={`${styles.modeChip} ${headerMode === 'search' ? styles.modeChipActive : ''}`}
                                onClick={() => setHeaderMode('search')}
                            >
                                Default
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeChip} ${headerMode === 'audio' ? styles.modeChipActive : ''}`}
                                onClick={() => setHeaderMode('audio')}
                            >
                                Audio Live
                            </button>
                            <button
                                type="button"
                                className={`${styles.modeChip} ${headerMode === 'video' ? styles.modeChipActive : ''}`}
                                onClick={() => setHeaderMode('video')}
                            >
                                Video Live
                            </button>
                        </div>
                    </div>

                    <div className={styles.pwaShell}>
                        {/* Top AppBar */}
                        <div className={styles.pwaAppBar}>
                            <div className={styles.pwaAppBarLeft}>
                                <ArrowLeft size={16} aria-hidden="true" />
                                <span className={styles.pwaEventTitle}>Nairobi Tech Summit 2026</span>
                            </div>
                            <div className={styles.pwaPresenceBtn}>
                                <span className={styles.presenceDot} aria-hidden="true" />
                                <Users size={14} aria-hidden="true" />
                                <span>142</span>
                            </div>
                        </div>

                        {/* ForumHeaderSection -> ForumHeader (#20f928 pill, 8px radius) */}
                        <div className={styles.forumHeaderPill}>
                            {headerMode === 'search' && (
                                <div className={styles.headerSearchSlot}>
                                    <span className={styles.headerForumName}>Community Forum</span>
                                    <div className={styles.headerRightIcons}>
                                        <Search size={15} aria-hidden="true" />
                                    </div>
                                </div>
                            )}

                            {headerMode === 'audio' && (
                                <div className={styles.headerLiveSlot}>
                                    <div className={styles.headerLiveInfo}>
                                        <Radio size={15} className={styles.pulseIcon} aria-hidden="true" />
                                        <div>
                                            <span className={styles.headerLiveTitle}>Live Audio Stage</span>
                                            <span className={styles.headerSpeakers}>Amina K. &amp; Brian M. speaking</span>
                                        </div>
                                    </div>
                                    <div className={styles.headerLiveActions}>
                                        <button
                                            type="button"
                                            onClick={() => setIsMuted((m) => !m)}
                                            className={styles.headerIconBtn}
                                            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                                        >
                                            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setHeaderMode('search')}
                                            className={styles.headerEndBtn}
                                            aria-label="Leave live audio"
                                        >
                                            <PhoneOff size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {headerMode === 'video' && (
                                <div className={styles.headerLiveSlot}>
                                    <div className={styles.headerLiveInfo}>
                                        <Video size={15} className={styles.pulseIcon} aria-hidden="true" />
                                        <div>
                                            <span className={styles.headerLiveTitle}>Main Stage Stream</span>
                                            <span className={styles.headerSpeakers}>98 watching live</span>
                                        </div>
                                    </div>
                                    <div className={styles.headerLiveActions}>
                                        <button
                                            type="button"
                                            onClick={() => setHeaderMode('search')}
                                            className={styles.headerEndBtn}
                                            aria-label="Minimize video stream"
                                        >
                                            End
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ForumAdBanner (50px height AdCarousel) */}
                        <button
                            type="button"
                            className={styles.forumAdBanner}
                            onClick={() => setSponsorIdx((i) => (i + 1) % SPONSOR_SLIDES.length)}
                            title="Click to cycle sponsor banner"
                        >
                            <div className={styles.adBannerLeft}>
                                <span className={styles.adBadge}>Sponsored</span>
                                <div className={styles.adTextGroup}>
                                    <span className={styles.adBrand}>{activeSponsor.brand}</span>
                                    <span className={styles.adTagline}>{activeSponsor.tagline}</span>
                                </div>
                            </div>
                            <span className={styles.adCta}>{activeSponsor.cta} →</span>
                        </button>

                        {/* ForumTabBar (48px height, 3 exact tabs: Updates, Live chat, Media) */}
                        <div className={styles.forumTabBar} role="tablist" aria-label="Forum tabs">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'updates'}
                                className={`${styles.forumTab} ${activeTab === 'updates' ? styles.forumTabActive : ''}`}
                                onClick={() => setActiveTab('updates')}
                            >
                                <span className={styles.tabLabelRow}>Updates</span>
                                <span className={styles.tabIndicator} />
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'chat'}
                                className={`${styles.forumTab} ${activeTab === 'chat' ? styles.forumTabActive : ''}`}
                                onClick={() => setActiveTab('chat')}
                            >
                                <span className={styles.tabLabelRow}>
                                    {activeTab !== 'chat' && <span className={styles.liveRedDot} aria-hidden="true" />}
                                    Live chat
                                </span>
                                <span className={styles.tabIndicator} />
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'media'}
                                className={`${styles.forumTab} ${activeTab === 'media' ? styles.forumTabActive : ''}`}
                                onClick={() => setActiveTab('media')}
                            >
                                <span className={styles.tabLabelRow}>Media</span>
                                <span className={styles.tabIndicator} />
                            </button>
                        </div>

                        {/* Tab Content Body */}
                        <div className={styles.forumBody} role="tabpanel">
                            {activeTab === 'updates' && (
                                <div className={styles.updatesFeed}>
                                    {/* Organizer announcement */}
                                    <div className={styles.updateCard}>
                                        <div className={styles.msgHeader}>
                                            <span className={styles.organizerName}>Amina K.</span>
                                            <span className={styles.organizerBadge}>Organizer</span>
                                            <span className={styles.msgTime}>2m ago</span>
                                        </div>
                                        <p className={styles.msgText}>
                                            Doors for Main Hall B are open! Have your Lynk-X QR pass ready at the express lane.
                                        </p>
                                    </div>

                                    {/* Live Call Join Card (join_card.dart) */}
                                    <div className={styles.joinCard}>
                                        <div className={styles.joinCardLeft}>
                                            <span className={styles.joinIconWrap}>
                                                <Radio size={15} aria-hidden="true" />
                                            </span>
                                            <div>
                                                <div className={styles.joinTitle}>Host started a live audio room</div>
                                                <div className={styles.joinSub}>Fireside Q&amp;A • 38 listeners</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.joinBtn}
                                            onClick={() => setHeaderMode('audio')}
                                        >
                                            Join
                                        </button>
                                    </div>

                                    {/* Interactive Poll inside Updates */}
                                    <div className={styles.pollCard}>
                                        <div className={styles.pollHeader}>
                                            <BarChart3 size={14} aria-hidden="true" />
                                            <span>Live Poll • Which breakout session next?</span>
                                            <span className={styles.pollTotal}>{totalVotes} votes</span>
                                        </div>
                                        <div className={styles.pollList}>
                                            {pollOptions.map((opt) => {
                                                const pct = Math.round((opt.votes / totalVotes) * 100);
                                                const isPicked = votedOptionId === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => handleVote(opt.id)}
                                                        className={`${styles.pollOption} ${isPicked ? styles.pollOptionPicked : ''}`}
                                                    >
                                                        <span
                                                            className={styles.pollFill}
                                                            style={{ width: `${pct}%` }}
                                                            aria-hidden="true"
                                                        />
                                                        <span className={styles.pollLabel}>{opt.label}</span>
                                                        <span className={styles.pollPct}>{pct}%</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className={styles.chatFeed}>
                                    <div className={styles.chatBubbleRow}>
                                        <div className={styles.chatAvatar}>DM</div>
                                        <div className={styles.chatBubble}>
                                            <div className={styles.msgHeader}>
                                                <span className={styles.senderName}>David M.</span>
                                                <span className={styles.msgTime}>Just now</span>
                                            </div>
                                            <p className={styles.msgText}>
                                                Express check-in took under 10 seconds. Where is the coffee bar?
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.chatBubbleRow}>
                                        <div className={`${styles.chatAvatar} ${styles.chatAvatarOrg}`}>AK</div>
                                        <div className={`${styles.chatBubble} ${styles.chatBubbleOrg}`}>
                                            <div className={styles.msgHeader}>
                                                <span className={styles.organizerName}>Amina K.</span>
                                                <span className={styles.organizerBadge}>Organizer</span>
                                                <span className={styles.msgTime}>Just now</span>
                                            </div>
                                            <p className={styles.msgText}>
                                                Right beside the Mezzanine sponsor lounge — grab a cup before the 2 PM panel!
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.chatBubbleRow}>
                                        <div className={styles.chatAvatar}>ZN</div>
                                        <div className={styles.chatBubble}>
                                            <div className={styles.msgHeader}>
                                                <span className={styles.senderName}>Zuri N.</span>
                                                <span className={styles.msgTime}>1m ago</span>
                                            </div>
                                            <p className={styles.msgText}>
                                                Audio quality on the live room is super crisp from the courtyard.
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.typingIndicator}>
                                        <span className={styles.typingDots} aria-hidden="true">•••</span>
                                        <span>Brian is typing</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'media' && (
                                <div className={styles.mediaGrid}>
                                    {MEDIA_ITEMS.map((item) => (
                                        <div key={item.id} className={`${styles.mediaTile} ${styles[`tone_${item.tone}`]}`}>
                                            <ImageIcon size={18} className={styles.mediaIcon} aria-hidden="true" />
                                            <div className={styles.mediaMeta}>
                                                <span className={styles.mediaTitle}>{item.title}</span>
                                                <span className={styles.mediaTag}>{item.tag}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom MessageInput bar */}
                        <div className={styles.forumComposer}>
                            <span className={styles.composerPlaceholder}>
                                {activeTab === 'updates'
                                    ? 'Organizer announcement composer...'
                                    : activeTab === 'chat'
                                      ? 'Message Nairobi Tech Summit...'
                                      : 'Share photo or video to forum gallery...'}
                            </span>
                            <span className={styles.composerSend} aria-hidden="true">
                                <Send size={13} />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Option 2 — Organizer Command Stack */}
                <div className={styles.commandStack}>
                    {/* Tile 1: Live Gate Check-In Pulse */}
                    <div className={styles.commandCard}>
                        <div className={styles.commandHeader}>
                            <div className={styles.commandTitleGroup}>
                                <span className={styles.commandIcon}>
                                    <QrCode size={16} aria-hidden="true" />
                                </span>
                                <div>
                                    <h3 className={styles.commandTitle}>Live Gate Check-In Pulse</h3>
                                    <p className={styles.commandMeta}>QR scanner synced across 3 gates</p>
                                </div>
                            </div>
                            <span className={styles.livePill}>85% Checked In</span>
                        </div>

                        <div className={styles.progressWrap}>
                            <div className={styles.progressNumbers}>
                                <strong>384</strong>
                                <span>of 450 attendees</span>
                            </div>
                            <div className={styles.progressTrack} aria-hidden="true">
                                <div className={styles.progressFill} style={{ width: '85%' }} />
                            </div>
                        </div>

                        <div className={styles.scanFeed}>
                            <div className={styles.scanRow}>
                                <CheckCircle2 size={14} className={styles.scanCheck} aria-hidden="true" />
                                <span className={styles.scanTier}>VIP Pass • #TK-9412</span>
                                <span className={styles.scanTime}>12s ago</span>
                            </div>
                            <div className={styles.scanRow}>
                                <CheckCircle2 size={14} className={styles.scanCheck} aria-hidden="true" />
                                <span className={styles.scanTier}>Early Bird • #TK-9408</span>
                                <span className={styles.scanTime}>48s ago</span>
                            </div>
                        </div>
                    </div>

                    {/* Tile 2: M-Pesa & Card Payout Split */}
                    <div className={styles.commandCard}>
                        <div className={styles.commandHeader}>
                            <div className={styles.commandTitleGroup}>
                                <span className={styles.commandIcon}>
                                    <Wallet size={16} aria-hidden="true" />
                                </span>
                                <div>
                                    <h3 className={styles.commandTitle}>M-Pesa &amp; Card Payout Split</h3>
                                    <p className={styles.commandMeta}>Automated settlement ledger</p>
                                </div>
                            </div>
                            <span className={styles.settledPill}>Settled</span>
                        </div>

                        <div className={styles.payoutGrid}>
                            <div className={styles.payoutBox}>
                                <span className={styles.payoutLabel}>M-Pesa STK</span>
                                <strong className={styles.payoutValue}>KES 482,500</strong>
                                <span className={styles.payoutShare}>76% of sales</span>
                            </div>
                            <div className={styles.payoutBox}>
                                <span className={styles.payoutLabel}>Card Checkout</span>
                                <strong className={styles.payoutValue}>KES 152,000</strong>
                                <span className={styles.payoutShare}>24% of sales</span>
                            </div>
                        </div>
                    </div>

                    {/* Tile 3: Forum Sponsor Slot Preview */}
                    <div className={styles.commandCard}>
                        <div className={styles.commandHeader}>
                            <div className={styles.commandTitleGroup}>
                                <span className={styles.commandIcon}>
                                    <Megaphone size={16} aria-hidden="true" />
                                </span>
                                <div>
                                    <h3 className={styles.commandTitle}>Forum Sponsor Slot</h3>
                                    <p className={styles.commandMeta}>Monetize your event forum</p>
                                </div>
                            </div>
                            <Link href="/for/ad-sponsors" className={styles.commandLink}>
                                Sponsor Info →
                            </Link>
                        </div>

                        <p className={styles.sponsorDesc}>
                            Non-intrusive 50px banner placements sit cleanly above your forum tabs so verified attendees see partner offers without disrupting chat.
                        </p>

                        <div className={styles.sponsorMetrics}>
                            <span className={styles.metricTag}>
                                <Sparkles size={13} aria-hidden="true" />
                                100% Verified Ticket Holders
                            </span>
                            <span className={styles.metricTag}>Zero Feed Clutter</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
