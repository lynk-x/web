"use client";

/**
 * EventForm — multi-tab event creation / editing form.
 *
 * This file is intentionally thin: all state & business logic lives in the
 * `useEventForm` hook, and the ticket tier section is handled by
 * `TicketTierManager`. Each tab section is a simple JSX block.
 */

import React from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';
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
        thumbnailPreview,
        tagInput, setTagInput, filteredSuggestions, showSuggestions, setShowSuggestions,
        categories, isPaidTicketingEnabled,
        handleInputChange, handleToggle,
        handleImageSelect, handleRemoveImage,
        handleAddTag, handleRemoveTag, handleTagKeyDown,
        handleTicketChange, addTicket, removeTicket,
        handleSubmit, discardDraft,
        setFormData,
    } = useEventForm({ initialData, isEditMode, onSubmit });

    // ── Tab Helper ────────────────────────────────────────────────────────────
    const renderTab = (id: EventFormTab, label: string) => {
        const hasError = (
            (id === 'cover' && errors.thumbnailUrl) ||
            (id === 'basics' && (errors.title || errors.description)) ||
            (id === 'category' && errors.category) ||
            (id === 'time' && (errors.startDate || errors.endDate || errors.startTime || errors.endTime)) ||
            (id === 'place' && errors.location) ||
            (id === 'tickets' && Object.keys(errors).some((k) => k.startsWith('tickets')))
        );

        return (
            <div
                className={`${styles.tabItem} ${activeTab === id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(id)}
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
                <div className={styles.actions}>
                    <button className={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
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

            <div className={styles.formColumn}>

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
                                    onChange={(content) => setFormData((prev) => ({ ...prev, description: content }))}
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
                                <label className={styles.label}>Tags</label>
                                <div className={styles.tagContainer}>
                                    <div className={styles.tagInputWrapper}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Type to search tags..."
                                                value={tagInput}
                                                onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                                                onFocus={() => setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                onKeyDown={handleTagKeyDown}
                                                style={{ width: '100%' }}
                                            />
                                            {showSuggestions && tagInput && filteredSuggestions.length > 0 && (
                                                <div className={styles.suggestionsDropdown}>
                                                    {filteredSuggestions.map((tag) => (
                                                        <div key={tag.id} className={styles.suggestionItem} onClick={() => handleAddTag(tag.name)}>
                                                            {tag.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button type="button" className={styles.generateBtn} onClick={() => handleAddTag()}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line></svg>
                                            Add
                                        </button>
                                    </div>
                                    {formData.tags.length > 0 && (
                                        <div className={styles.tagList}>
                                            {formData.tags.map((tag) => (
                                                <span key={tag} className={styles.tagPill}>
                                                    {tag}
                                                    <button type="button" className={styles.removeTagBtn} onClick={() => handleRemoveTag(tag)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                        type={field.includes('Date') ? 'date' : 'time'}
                                        name={field}
                                        className={`${styles.input} ${errors[field] ? styles.inputError : ''}`}
                                        value={formData[field]}
                                        onChange={handleInputChange}
                                    />
                                    <p className={styles.errorMessage}>{errors[field]}</p>
                                </div>
                            ))}
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
                        errors={errors}
                        isPaidTicketingEnabled={isPaidTicketingEnabled}
                        isPaid={formData.isPaid}
                        onTogglePaid={() => handleToggle('isPaid')}
                        onAdd={addTicket}
                        onRemove={removeTicket}
                        onChange={handleTicketChange}
                        limit={formData.limit}
                        onLimitChange={(v) => setFormData((prev) => ({ ...prev, limit: v }))}
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
