"use client";

import React from 'react';
import styles from '../page.module.css';
import RichTextEditor from '@/components/ui/RichTextEditor';
import OutreachPreview from '@/components/admin/OutreachPreview';

export default function AdminOutreachPage() {
    const [subject, setSubject] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [audience, setAudience] = React.useState('All Users');

    const handleSend = () => {
        alert(`Sending announcement to ${audience}:\nSubject: ${subject}\nMessage: ${message}`);
        // Reset form
        setSubject('');
        setMessage('');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Outreach</h1>
                    <p className={styles.subtitle}>Manage platform-wide announcements and notifications.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className={styles.statCard} style={{ cursor: 'default', transform: 'none' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: '24px' }}>New Announcement</h2>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label className={styles.label}>Target Audience</label>
                            <select
                                className={styles.select}
                                style={{ width: '100%' }}
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                            >
                                <option>All Users</option>
                                <option>Organizers Only</option>
                                <option>Advertisers Only</option>
                            </select>
                        </div>
                        <div>
                            <label className={styles.label}>Subject</label>
                            <input
                                type="text"
                                placeholder="Announcement Title"
                                className={styles.input}
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Message</label>
                            <RichTextEditor
                                value={message}
                                onChange={setMessage}
                                placeholder="Type your message here..."
                            />
                        </div>
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ alignSelf: 'flex-start' }}
                            onClick={handleSend}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Send Announcement
                        </button>
                    </form>
                </div>

                <div className={styles.statCard} style={{ cursor: 'default', transform: 'none' }}>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: '24px' }}>Live Preview</h2>
                    <OutreachPreview
                        subject={subject}
                        message={message}
                        audience={audience}
                    />
                </div>
            </div>
        </div>
    );
}
