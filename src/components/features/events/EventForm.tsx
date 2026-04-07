"use client";

/**
 * EventForm — multi-tab event creation / editing form.
 *
 * This file is intentionally thin: all state & business logic lives in the
 * `useEventForm` hook, and the ticket tier section is handled by
 * `TicketTierManager`. Each tab section is a simple JSX block.
 */

import React, { useRef, useEffect } from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { sanitizeRichText } from '@/utils/sanitization';
import styles from './EventForm.module.css';
import BackButton from '@/components/shared/BackButton';
import TicketTierManager from './TicketTierManager';
import { useEventForm, type EventFormTab } from '@/hooks/useEventForm';
import type { OrganizerEventFormData as EventData } from '@/types/organize';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type { OrganizerEventFormData as EventData, OrganizerEventTicket as Ticket } from '@/types/organize';

interface EventFormProps {
    initialData?: Partial<EventData>;
    pageTitle: string;
    submitBtnText: string;
    onSubmit: (data: EventData, file?: File | null) => Promise<void>;
    isEditMode?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventForm({ initialData, pageTitle, submitBtnText, onSubmit, isEditMode = false }: EventFormProps) {
    const {
        formData, errors, loading, activeTab, setActiveTab,
        isDraftLoaded, isDirty,
        hasDraft, applyDraft,
        thumbnailPreview,
        tagInput, setTagInput,
        categories, popularTags, hasCategorySpecificTags,
        handleInputChange, handleToggle,
        handleImageSelect, handleRemoveImage,
        handleAddTag, handleRemoveTag, handleTagKeyDown,
        handleTicketChange, addTicket, removeTicket,
        handleSubmit, discardDraft,
        validateTab,
        setFormData,
    } = useEventForm({ initialData, isEditMode, onSubmit });

    const formRef = useRef<HTMLDivElement>(null);

    // ── Autofocus Logic ───────────────────────────────────────────────────────
    /**
     * When the user switches tabs, automatically focus the first available
     * text field, select, or textarea to improve data entry speed.
     */
    useEffect(() => {
        if (!formRef.current) return;

        // Small delay to ensure the tab content is fully rendered by React
        const timer = setTimeout(() => {
            if (!formRef.current) return;

            // Find the first relevant input element
            // We ignore file inputs as they don't benefit from autofocus as much as text fields
            const firstFocusable = formRef.current.querySelector(
                'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), select, textarea'
            ) as HTMLElement | null;

            if (firstFocusable) {
                firstFocusable.focus();
                
                // If it's a text input, place cursor at the end
                if (firstFocusable instanceof HTMLInputElement && (firstFocusable.type === 'text' || firstFocusable.type === 'search')) {
                    const val = firstFocusable.value;
                    firstFocusable.value = '';
                    firstFocusable.value = val;
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [activeTab]);

    // ── Tab Helper ────────────────────────────────────────────────────────────
    const TABS: EventFormTab[] = ['cover', 'basics', 'category', 'time', 'place', 'tickets', 'settings'];

    const handleTabSwitch = (target: EventFormTab) => {
        const currentIndex = TABS.indexOf(activeTab);
        const targetIndex = TABS.indexOf(target);

        // Allow moving backward freely
        if (targetIndex <= currentIndex) {
            setActiveTab(target);
            return;
        }

        // Validate current tab before moving forward
        if (validateTab(activeTab)) {
            setActiveTab(target);
        }
    };

    const renderTab = (id: EventFormTab, label: string) => {
        const hasError = (
            (id === 'cover' && errors.thumbnailUrl) ||
            (id === 'basics' && (errors.title || errors.description)) ||
            (id === 'category' && (errors.category || errors.tags)) ||
            (id === 'time' && (errors.startDate || errors.endDate || errors.startTime || errors.endTime)) ||
            (id === 'place' && errors.location) ||
            (id === 'tickets' && Object.keys(errors).some((k) => k.startsWith('tickets')))
        );

        return (
            <div
                key={id}
                className={`${styles.tabItem} ${activeTab === id ? styles.activeTab : ''}`}
                onClick={() => handleTabSwitch(id)}
                style={hasError ? { color: 'var(--color-interface-error)', borderColor: 'var(--color-interface-error)' } : {}}
            >
                {label}
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Events" isDirty={isDirty} />
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className={styles.title}>{pageTitle}</h1>
                            {isDraftLoaded && !isEditMode && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.2)', color: 'var(--color-brand-primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Draft Restored</span>
                                    <button onClick={discardDraft} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}>Discard</button>
                                </div>
                            )}
                        </div>
                        <p className={styles.subtitle}>
                            {isEditMode ? 'Make changes to your event' : 'Create a new event from scratch'}
                        </p>
                    </div>
                </div>

                {/* Draft Restoration Banner */}
                {hasDraft && !isDraftLoaded && (
                    <div className={styles.draftBanner}>
                        <div className={styles.draftInfo}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            <span>You have an unsaved draft. Would you like to restore it?</span>
                        </div>
                        <div className={styles.draftActions}>
                            <button onClick={applyDraft} className={styles.restoreBtn}>Restore Previous Work</button>
                            <button onClick={discardDraft} className={styles.discardBtn}>Ignore</button>
                        </div>
                    </div>
                )}

                <div className={styles.actions}>
                    {!isEditMode && (
                        <button 
                            className={styles.secondaryBtn} 
                            onClick={() => handleSubmit('draft')} 
                            disabled={loading}
                        >
                            Save as Draft
                        </button>
                    )}
                    <button className={styles.saveBtn} onClick={() => handleSubmit('published')} disabled={loading}>
                        {loading ? 'Saving...' : submitBtnText}
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className={styles.tabs}>
                {renderTab('cover', 'Cover Image')}
                {renderTab('basics', 'Basics')}
                {renderTab('category', 'Category')}
                {renderTab('time', 'Time')}
                {renderTab('place', 'Place')}
                {renderTab('tickets', 'Tickets')}
                {renderTab('settings', 'Settings')}
            </div>

            <div className={styles.formColumn} ref={formRef}>

                {/* ── 1. Cover Image ── */}
                {activeTab === 'cover' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Cover Image <span className={styles.requiredIndicator}>*Required</span></h2>
                        {thumbnailPreview ? (
                            <div className={styles.imagePreviewContainer} style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={thumbnailPreview} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                                    <label htmlFor="cover-upload-change" className={styles.secondaryBtn} style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(4px)' }}>Change</label>
                                    <button type="button" onClick={handleRemoveImage} className={styles.secondaryBtn} style={{ background: 'rgba(0,0,0,0.6)', color: '#ff4d4d', backdropFilter: 'blur(4px)', borderColor: '#ff4d4d' }}>Remove</button>
                                </div>
                                <input id="cover-upload-change" type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                            </div>
                        ) : (
                            <div className={styles.uploadArea}>
                                <label htmlFor="cover-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '100%', height: '100%' }}>
                                    <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    <span className={styles.uploadText}>Drag &amp; drop cover image or click to browse</span>
                                    <span style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>Recommended: 1920x1080px (16:9)</span>
                                </label>
                                <input id="cover-upload" type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                            </div>
                        )}
                        {errors.thumbnailUrl && <p className={styles.errorMessage} style={{ textAlign: 'center', marginTop: '12px' }}>{errors.thumbnailUrl}</p>}
                    </section>
                )}

                {/* ── 2. Basics ── */}
                {activeTab === 'basics' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Event Basics</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Event Title <span className={styles.requiredIndicator}>*Required</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    className={`${styles.input} ${errors.title ? 'input-error' : (formData.title ? 'input-success' : '')}`}
                                    placeholder="Give it a short, distinct name"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                />
                                {errors.title ? (
                                    <p className="validation-hint error">{errors.title}</p>
                                ) : formData.title ? (
                                    <p className="validation-hint success">Looks Good!</p>
                                ) : null}
                            </div>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Description <span className={styles.requiredIndicator}>*Required</span></label>
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(content) => setFormData((prev) => ({ ...prev, description: sanitizeRichText(content) }))}
                                    placeholder="Tell people what your event is about..."
                                    error={!!errors.description}
                                />
                                <p className={styles.errorMessage}>{errors.description}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── 3. Category & Tags ── */}
                {activeTab === 'category' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Category &amp; Tags</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Category <span className={styles.requiredIndicator}>*Required</span></label>
                                <select
                                    name="category"
                                    className={`${styles.selectInput} ${errors.category ? styles.inputError : ''}`}
                                    value={formData.category}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="">Select a category</option>
                                    {categories.length > 0
                                        ? categories.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)
                                        : <option value="">Loading categories...</option>
                                    }
                                </select>
                                <p className={styles.errorMessage}>{errors.category}</p>
                            </div>

                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Tags <span className={styles.requiredIndicator}>*Required (minimum of 1)</span></label>
                                <div className={styles.tagContainer}>
                                    <div className={styles.tagInputWrapper}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Type to search tags..."
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Selected Tags */}
                                    {formData.tags.length > 0 && (
                                        <div className={styles.tagList} style={{ marginBottom: '20px' }}>
                                            {formData.tags.map((tag: string) => (
                                                <span key={tag} className={styles.tagPill}>
                                                    {tag}
                                                    <button type="button" className={styles.removeTagBtn} onClick={() => handleRemoveTag(tag)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Suggested Tags (Choice Chips) */}
                                    {popularTags.length > 0 && (
                                        <>
                                            {(tagInput || hasCategorySpecificTags) && (
                                                <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px', color: 'var(--color-utility-primaryText)' }}>
                                                    {tagInput ? 'Suggested matches:' : 'Recommended for your category:'}
                                                </p>
                                            )}
                                            <div className={styles.choiceGrid}>
                                                {popularTags.map((tag: string) => {
                                                    const isSelected = formData.tags.includes(tag);
                                                    return (
                                                        <div 
                                                            key={tag} 
                                                            className={`${styles.choiceChip} ${isSelected ? styles.choiceChipSelected : ''}`}
                                                            onClick={() => isSelected ? handleRemoveTag(tag) : handleAddTag(tag)}
                                                        >
                                                            {tag}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className={styles.errorMessage}>{errors.tags}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── 4. Time ── */}
                {activeTab === 'time' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Date &amp; Time</h2>
                        <div className={styles.formGrid}>
                            {(['startDate', 'startTime', 'endDate', 'endTime'] as const).map((field) => (
                                <div key={field} className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        {field === 'startDate' ? 'Start Date' : field === 'startTime' ? 'Start Time' : field === 'endDate' ? 'End Date' : 'End Time'}
                                        {' '}<span className={styles.requiredIndicator}>*Required</span>
                                    </label>
                                    <input
                                        type={field.includes('Date') ? (formData[field] ? 'date' : 'text') : 'time'}
                                        name={field}
                                        lang={field.includes('Date') ? "en-GB" : undefined}
                                        className={`${styles.input} ${errors[field] ? styles.inputError : ''}`}
                                        value={formData[field]}
                                        onChange={handleInputChange}
                                        placeholder={field.includes('Date') ? 'dd/mm/yyyy' : undefined}
                                        onFocus={field.includes('Date') ? (e) => (e.target.type = 'date') : undefined}
                                        onBlur={field.includes('Date') ? (e) => { if (!e.target.value) e.target.type = 'text'; } : undefined}
                                    />
                                    <p className={styles.errorMessage}>{errors[field]}</p>
                                </div>
                            ))}
                        </div>

                        {/* Timezone Selection */}
                        <div className={styles.formGrid} style={{ marginTop: '24px' }}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>
                                    Event Timezone <span className={styles.requiredIndicator}>*Required</span>
                                </label>
                                <select 
                                    name="timezone"
                                    className={styles.selectInput}
                                    value={formData.timezone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                                >
                                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                    <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                                </select>
                                <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '8px' }}>
                                    All attendees will see times relative to this timezone.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── 5. Place ── */}
                {activeTab === 'place' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Location</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Is this an Online Event?</label>
                                <div className={styles.toggleRow}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" className={styles.checkbox} checked={formData.isOnline} onChange={() => handleToggle('isOnline')} />
                                        Yes, it&#39;s an online event
                                    </label>
                                </div>
                            </div>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>
                                    {formData.isOnline
                                        ? <span>Meeting Link <span className={styles.requiredIndicator}>*Required</span></span>
                                        : <span>Venue Location <span className={styles.requiredIndicator}>*Required</span></span>
                                    }
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    className={`${styles.input} ${errors.location ? styles.inputError : ''}`}
                                    placeholder={formData.isOnline ? 'e.g. Zoom or Google Meet Link' : 'e.g. 123 Event St, Nairobi'}
                                    value={formData.location}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.location}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── 6. Tickets — delegated to TicketTierManager ── */}
                {activeTab === 'tickets' && (
                    <TicketTierManager
                        tickets={formData.tickets}
                        currency={formData.currency}
                        onCurrencyChange={(val) => setFormData((prev) => ({ ...prev, currency: val }))}
                        errors={errors}
                        onAdd={addTicket}
                        onRemove={removeTicket}
                        onChange={handleTicketChange}
                    />
                )}

                {/* ── 7. Settings ── */}
                {activeTab === 'settings' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Event Settings</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <div className={styles.toggleRow} style={{ marginBottom: '16px' }}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" className={styles.checkbox} checked={formData.isPrivate} onChange={() => handleToggle('isPrivate')} />
                                        <strong>Private Event</strong> (Invite only)
                                    </label>
                                </div>
                                <p style={{ fontSize: '13px', opacity: 0.6, marginLeft: '32px' }}>
                                    Private events are not listed in the public directory.
                                </p>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
