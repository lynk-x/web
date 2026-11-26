'use client';

import { useState } from 'react';
import styles from './ForumDevicePreview.module.css';

type ForumTab = 'updates' | 'chat' | 'media';

const TABS: { key: ForumTab; label: string; blurb: string }[] = [
    { key: 'updates', label: 'Updates', blurb: 'Pinned organizer announcements with push alerts.' },
    { key: 'chat', label: 'Live chat', blurb: 'The whole crowd talking in real time with reactions.' },
    { key: 'media', label: 'Media', blurb: 'One shared wall for every photo and clip.' },
];

const MEDIA_TILES: { src: string; isVideo?: boolean }[] = [
    { src: '/forum-demo/media-4.webp', isVideo: true },
    { src: '/forum-demo/media-8.webp', isVideo: true },
    { src: '/forum-demo/media-1.webp' },
    { src: '/forum-demo/media-2.webp' },
    { src: '/forum-demo/media-3.webp' },
    { src: '/forum-demo/media-5.webp' },
    { src: '/forum-demo/media-6.webp' },
    { src: '/forum-demo/media-7.webp' },
    { src: '/forum-demo/media-4.webp' },
];

const REACTIONS = ['❤️', '🔥', '😂', '🎉', '👍', '👎', '🥁'];
const FLOATING_EMOJIS = ['🔥', '❤️', '👏', '🎉', '😂'];

/* ------------------------------------------------------------------ */
/* Inline icons copied from the marketing device demos so the mockup   */
/* matches the PWA pixel for pixel without pulling in extra packages.  */
/* ------------------------------------------------------------------ */

function BackIcon() {
    return (
        <svg width="1.8em" height="1.8em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AddMemberIcon() {
    return (
        <svg width="1.8em" height="1.8em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M19 8v6M22 11h-6M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ChatBubbleIcon() {
    return (
        <svg width="1.4em" height="1.4em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg width="1.4em" height="1.4em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="#000" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg width="2.4em" height="2.4em" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.4 1.06L4.5 12 2 17.34a1 1 0 001.4 1.06z" />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg width="2.6em" height="2.6em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.6" />
            <path d="M10 8l6 4-6 4V8z" fill="#fff" />
        </svg>
    );
}

function ImageUploadIcon() {
    return (
        <svg width="1.3em" height="1.3em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#000" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="#000" />
            <path d="M21 15l-5-5L5 21" stroke="#000" strokeWidth="2" />
        </svg>
    );
}

function VideoUploadIcon() {
    return (
        <svg width="1.3em" height="1.3em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="6" width="15" height="12" rx="2" stroke="#000" strokeWidth="2" />
            <path d="M17 10l5-3v10l-5-3" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

interface ForumScreenProps {
    activeTab: ForumTab;
    onTabChange: (tab: ForumTab) => void;
    /** When false the tab buttons are removed from keyboard focus (duplicate desktop copy). */
    focusable: boolean;
}

/**
 * One rendering of the PWA forum screen (app bar, green forum header, tab bar
 * and the active tab body). Shared by the phone and desktop frames so both
 * always show the same state.
 */
function ForumScreen({ activeTab, onTabChange, focusable }: ForumScreenProps) {
    return (
        <>
            <div className={styles.appBar}>
                <BackIcon />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.wordmark} src="/lynk-x_combined_logo.svg" alt="" />
                <AddMemberIcon />
            </div>

            <div className={styles.forumHeader}>
                <div className={styles.fhLeft}>
                    <ChatBubbleIcon />
                    <span className={styles.fhName}>Afrofest Squad</span>
                </div>
                <SearchIcon />
            </div>

            <div className={styles.tabBar} role={focusable ? 'tablist' : undefined} aria-label={focusable ? 'Forum tabs' : undefined}>
                {TABS.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role={focusable ? 'tab' : undefined}
                            aria-selected={focusable ? isActive : undefined}
                            tabIndex={focusable ? 0 : -1}
                            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                            onClick={() => onTabChange(tab.key)}
                        >
                            {tab.key === 'chat' && !isActive && <span className={styles.unreadDot} aria-hidden="true" />}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Keyed so the entrance animations replay whenever the tab changes. */}
            <div key={activeTab} className={styles.tabBody}>
                {activeTab === 'updates' && <UpdatesBody />}
                {activeTab === 'chat' && <LiveChatBody />}
                {activeTab === 'media' && <MediaBody />}
            </div>
        </>
    );
}

/** Updates tab: category chips, pinned banner and organizer-only feed. */
function UpdatesBody() {
    return (
        <>
            <div className={styles.categoryFilter}>
                <span className={`${styles.chip} ${styles.chipActive}`}>All</span>
                <span className={styles.chip}>Urgent</span>
                <span className={styles.chip}>Activity</span>
                <span className={styles.chip}>Resources</span>
            </div>

            <div className={styles.infoBanner}>
                <span aria-hidden="true">📌</span>
                <span>Rooftop bar closes at 11PM — last orders 10:45...</span>
            </div>

            <div className={styles.feed}>
                <div className={styles.msgRow}>
                    <span className={styles.senderLine}>Organizer • 17:10</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>
                        DJ set starting now on the main stage. Don&apos;t miss the opener.
                    </div>
                </div>
                <div className={styles.msgRow}>
                    <span className={styles.senderLine}>Organizer • 17:41</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>
                        <span className={`${styles.categoryBadge} ${styles.catResources}`}>#Resources</span>
                        <br />
                        Rooftop bar closes at 11PM. Last orders 10:45.
                    </div>
                </div>
                <div className={`${styles.msgRow} ${styles.slamIn}`}>
                    <span className={styles.senderLine}>Organizer • 18:24</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>
                        <span className={`${styles.categoryBadge} ${styles.catUrgent}`}>#Urgent</span>
                        <br />
                        Last call for the rooftop shuttle — final pickup at 18:40.
                    </div>
                </div>
            </div>

            <div className={styles.noComposeNote}>Only organizers can post updates</div>
        </>
    );
}

/** Live chat tab: reaction strip, chat bubbles, typing loop and composer. */
function LiveChatBody() {
    return (
        <>
            <div className={styles.reactionStrip} aria-hidden="true">
                {REACTIONS.map((emoji) => (
                    <span key={emoji}>{emoji}</span>
                ))}
            </div>

            <div className={styles.feed}>
                <div className={styles.msgRow}>
                    <span className={styles.senderLine}>Zawadi M. • 21:04</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>the DJ set right now is insane 🔥</div>
                </div>
                <div className={styles.msgRow}>
                    <span className={styles.senderLine}>Brian O. • 21:05</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>
                        <span className={`${styles.categoryBadge} ${styles.catActivity}`}>#Activity</span>
                        <br />
                        where&apos;s the rooftop bar? can&apos;t find it lol
                    </div>
                </div>
                <div className={`${styles.msgRow} ${styles.msgRowOwn}`}>
                    <div className={`${styles.bubble} ${styles.bubbleOwn}`}>
                        <span className={styles.mention}>@Brian</span> north side, past the stage
                        <span className={styles.editedTag}>[edited]</span>
                    </div>
                </div>
                <div className={styles.msgRow}>
                    <span className={styles.senderLine}>Denis K. • 21:07</span>
                    <div className={`${styles.bubble} ${styles.bubbleOther}`}>on my way 🎉</div>
                </div>

                {/* Typing indicator and the message it turns into share one slot. */}
                <div className={styles.incomingSlot}>
                    <div className={styles.typingRow} aria-hidden="true">
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                    </div>
                    <div className={`${styles.msgRow} ${styles.incomingMsg}`}>
                        <span className={styles.senderLine}>Denis K. • 21:08</span>
                        <div className={`${styles.bubble} ${styles.bubbleOther}`}>save me a spot up front 👏</div>
                    </div>
                </div>

                {FLOATING_EMOJIS.map((emoji, i) => (
                    <span key={emoji} className={`${styles.floatEmoji} ${styles[`e${i + 1}`]}`} aria-hidden="true">
                        {emoji}
                    </span>
                ))}
            </div>

            <div className={styles.composerRow}>
                <div className={styles.composerField}>Type a message...</div>
                <SendIcon />
            </div>
        </>
    );
}

/** Media tab: shared photo and video wall with upload bar. */
function MediaBody() {
    return (
        <>
            <div className={styles.mediaGrid}>
                {MEDIA_TILES.map((tile, i) => (
                    <div
                        key={`${tile.src}-${i}`}
                        className={`${styles.tile} ${tile.isVideo ? styles.tileVideo : ''}`}
                        style={{ backgroundImage: `url('${tile.src}')`, animationDelay: `${i * 0.08}s` }}
                    >
                        {tile.isVideo && <PlayIcon />}
                    </div>
                ))}
            </div>

            <div className={styles.uploadBar}>
                <div className={styles.uploadBtn}>
                    <ImageUploadIcon />
                    Upload images
                </div>
                <div className={styles.uploadBtn}>
                    <VideoUploadIcon />
                    Upload videos
                </div>
            </div>
        </>
    );
}

/**
 * Homepage showcase pairing a 1:1 phone mockup of the Lynk-X event forum
 * (matching the marketing device demos) with a laptop browser preview of the
 * same page. Tabs are synced across both frames and the caption row.
 */
export default function ForumDevicePreview() {
    const [activeTab, setActiveTab] = useState<ForumTab>('chat');

    return (
        <section className={styles.section} aria-labelledby="forum-preview-heading">
            <div className={styles.header}>
                <span className={styles.eyebrow}>Inside Every Lynk-X Event</span>
                <h2 id="forum-preview-heading" className={styles.title}>
                    One Forum. <span className={styles.accent}>Every Screen.</span>
                </h2>
                <p className={styles.sub}>
                    Every ticket unlocks a live event forum for organizer updates, crowd chat and a shared media wall. It opens instantly in any phone or laptop browser with no app download.
                </p>
            </div>

            <div className={styles.stage}>
                {/* Desktop browser preview (decorative duplicate of the phone screen). */}
                <div className={styles.laptop} aria-hidden="true">
                    <div className={styles.bezel}>
                        <div className={styles.cameraRow}>
                            <span className={styles.cameraDot} />
                        </div>
                        <div className={styles.laptopScreen}>
                            <div className={styles.desktopCanvas}>
                                <div className={styles.browserChrome}>
                                    <span className={styles.trafficLights}>
                                        <i />
                                        <i />
                                        <i />
                                    </span>
                                    <span className={styles.urlBar}>lynk-x.app/forum/afrofest-squad</span>
                                </div>
                                <div className={styles.desktopForum}>
                                    <ForumScreen activeTab={activeTab} onTabChange={setActiveTab} focusable={false} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.hinge} />
                    <div className={styles.base} />
                </div>

                {/* Phone mockup (primary, keyboard accessible). */}
                <div className={styles.phoneWrap}>
                    <div className={styles.phone}>
                        <div className={styles.notch} />
                        <div className={styles.phoneScreen}>
                            <div className={styles.statusBar}>
                                <span>9:41</span>
                                <span>●●●●</span>
                            </div>
                            <ForumScreen activeTab={activeTab} onTabChange={setActiveTab} focusable />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.captionRow}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`${styles.captionCard} ${tab.key === activeTab ? styles.captionCardActive : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        aria-pressed={tab.key === activeTab}
                    >
                        <span className={styles.captionLabel}>{tab.label}</span>
                        <span className={styles.captionBlurb}>{tab.blurb}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
