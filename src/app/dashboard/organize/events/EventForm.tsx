"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/ui/RichTextEditor';
import styles from './events.module.css';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import type { OrganizerEventFormData as EventData, OrganizerEventTicket as Ticket } from '@/types/organize';

// ─── Public Types ────────────────────────────────────────────────────────────

export type { OrganizerEventFormData as EventData, OrganizerEventTicket as Ticket } from '@/types/organize';

interface EventFormProps {
    initialData?: Partial<EventData>;
    pageTitle: string;
    submitBtnText: string;
    onSubmit: (data: EventData, file?: File | null) => Promise<void>;
    isEditMode?: boolean;
}

const CATEGORIES = [
    { id: 'Arts&Entertainment', name: 'Arts & Entertainment' },
    { id: 'Business&Professional', name: 'Business & Professional' },
    { id: 'Sports&Games', name: 'Sports & Games' },
    { id: 'Food&Drinks', name: 'Food & Drinks' },
    { id: 'Education&Training', name: 'Education & Training' },
    { id: 'Health&Wellness', name: 'Health & Wellness' },
    { id: 'Community&Social', name: 'Community & Social' },
    { id: 'Seasonal&Holiday', name: 'Seasonal & Holiday' }
];
type Tab = 'cover' | 'basics' | 'time' | 'place' | 'tickets' | 'settings';

export default function EventForm({ initialData, pageTitle, submitBtnText, onSubmit, isEditMode = false }: EventFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('cover');
    const [tagInput, setTagInput] = useState('');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // Image State
    const [thumbnailUrlFile, setThumbnailUrlFile] = useState<File | null>(null);
    const [thumbnailUrlPreview, setThumbnailUrlPreview] = useState<string | null>(initialData?.thumbnailUrl || null);

    // Form State
    const [formData, setFormData] = useState<EventData>({
        title: '',
        description: '',
        category: 'Arts&Entertainment', // Default to first valid category
        tags: [],
        thumbnailUrl: '',
        isOnline: false,
        location: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        isPrivate: false,
        isPaid: false,
        limit: '',
        tickets: []
    });

    // Local Storage for Drafts
    const [draft, setDraft] = useLocalStorage<EventData | null>('event_draft', null);

    // Load Initial Data or Draft
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
            if (initialData.thumbnailUrl) setThumbnailUrlPreview(initialData.thumbnailUrl);
        } else if (!isEditMode && draft) {
            setFormData(prev => ({ ...prev, ...draft }));
            setIsDraftLoaded(true);
        }
    }, [initialData, isEditMode]); // Run once on mount or when initialData changes

    // Auto-Save Draft
    useEffect(() => {
        if (!isEditMode && formData.title) {
            const timeoutId = setTimeout(() => {
                setDraft(formData);
            }, 1000); // Debounce 1s
            return () => clearTimeout(timeoutId);
        }
    }, [formData, isEditMode, setDraft]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Basics
        if (!formData.title.trim()) newErrors.title = 'Event title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';

        // Time
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.startTime) newErrors.startTime = 'Start time is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (!formData.endTime) newErrors.endTime = 'End time is required';

        if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);
            if (end < start) {
                newErrors.endDate = 'End date/time cannot be before start date/time';
            }
        }

        // Place
        if (!formData.isOnline && !formData.location.trim()) {
            newErrors.location = 'Location is required for in-person events';
        }

        // Tickets
        if (formData.isPaid) {
            formData.tickets.forEach((ticket, index) => {
                if (!ticket.name.trim()) newErrors[`tickets.${index}.name`] = 'Ticket name is required';
                if (!ticket.price || parseFloat(ticket.price) < 0) newErrors[`tickets.${index}.price`] = 'Price must be a positive number';
                if (!ticket.quantity || parseInt(ticket.quantity) <= 0) newErrors[`tickets.${index}.quantity`] = 'Quantity must be a positive integer';

                // Advanced Validation
                if (ticket.saleStart && ticket.saleEnd) {
                    const start = new Date(ticket.saleStart);
                    const end = new Date(ticket.saleEnd);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
                        newErrors[`tickets.${index}.saleEnd`] = 'Sale end must be after sale start';
                    }
                }

                if (ticket.maxPerOrder) {
                    const max = parseInt(ticket.maxPerOrder);
                    if (max <= 0) {
                        newErrors[`tickets.${index}.maxPerOrder`] = 'Max per order must be positive';
                    }
                    if (ticket.quantity && max > parseInt(ticket.quantity)) {
                        newErrors[`tickets.${index}.maxPerOrder`] = 'Cannot exceed total quantity';
                    }
                }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleToggle = (field: keyof EventData) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Image Logic
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailUrlFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailUrlPreview(reader.result as string);
                setFormData(prev => ({ ...prev, thumbnailUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setThumbnailUrlFile(null);
        setThumbnailUrlPreview(null);
        setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
    };

    // Tag Logic
    const handleAddTag = () => {
        // ... (existing tag logic)
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    // Ticket Logic
    const handleTicketChange = (index: number, field: keyof Ticket, value: string) => {
        const newTickets = [...formData.tickets];
        newTickets[index] = { ...newTickets[index], [field]: value };
        setFormData(prev => ({ ...prev, tickets: newTickets }));

        // Clear specific ticket errors
        const errorKey = `tickets.${index}.${field}`;
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const addTicket = () => {
        setFormData(prev => ({
            ...prev,
            tickets: [...prev.tickets, { name: '', price: '', quantity: '' }]
        }));
    };

    const removeTicket = (index: number) => {
        setFormData(prev => ({
            ...prev,
            tickets: prev.tickets.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            // Find first tab with error and switch to it
            if (errors.title || errors.description) setActiveTab('basics');
            else if (errors.startDate || errors.endDate || errors.startTime || errors.endTime) setActiveTab('time');
            else if (errors.location) setActiveTab('place');
            else if (Object.keys(errors).some(k => k.startsWith('tickets'))) setActiveTab('tickets');
            return;
        }

        setLoading(true);
        await onSubmit(formData, thumbnailUrlFile);
        setLoading(false);
    };

    const renderTab = (id: Tab, label: string) => {
        const hasError = (
            (id === 'basics' && (errors.title || errors.description)) ||
            (id === 'time' && (errors.startDate || errors.endDate || errors.startTime || errors.endTime)) ||
            (id === 'place' && (errors.location)) ||
            (id === 'tickets' && Object.keys(errors).some(k => k.startsWith('tickets')))
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

    return (
        <div className={styles.container}>
            {/* ... (existing header) ... */}
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.back()} className={styles.cancelBtn} style={{ padding: '8px', border: 'none' }} title="Go Back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className={styles.title}>{pageTitle}</h1>
                            {isDraftLoaded && !isEditMode && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Draft Restored</span>}
                        </div>
                        <p className={styles.subtitle}>
                            {isEditMode ? 'Make changes to your event' : 'Create a new event from scratch'}
                        </p>
                    </div>
                </div>
                <div className={styles.actions}>
                    {/* <Link href="/dashboard/events" className={styles.cancelBtn}>Cancel</Link> */} {/* Replaced by back arrow */}
                    <button className={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : submitBtnText}
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className={styles.tabs}>
                {renderTab('cover', 'Cover Image')}
                {renderTab('basics', 'Basics')}
                {renderTab('time', 'Time')}
                {renderTab('place', 'Place')}
                {renderTab('tickets', 'Tickets')}
                {renderTab('settings', 'Settings')}
            </div>

            <div className={styles.formColumn}>

                {/* 1. Cover Image (Was Media) */}
                {activeTab === 'cover' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Cover Image</h2>
                        {thumbnailUrlPreview ? (
                            <div className={styles.imagePreviewContainer} style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={thumbnailUrlPreview} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                                    <label htmlFor="cover-upload-change" className={styles.secondaryBtn} style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(4px)' }}>
                                        Change
                                    </label>
                                    <button type="button" onClick={handleRemoveImage} className={styles.secondaryBtn} style={{ background: 'rgba(0,0,0,0.6)', color: '#ff4d4d', backdropFilter: 'blur(4px)', borderColor: '#ff4d4d' }}>
                                        Remove
                                    </button>
                                </div>
                                <input
                                    id="cover-upload-change"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        ) : (
                            <div className={styles.uploadArea}>
                                <label htmlFor="cover-upload" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '100%', height: '100%' }}>
                                    <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    <span className={styles.uploadText}>Drag & drop cover image or click to browse</span>
                                    <span style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>Recommended: 1920x1080px (16:9)</span>
                                </label>
                                <input
                                    id="cover-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}
                    </section>
                )}

                {/* 2. Basics */}
                {activeTab === 'basics' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Event Basics</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Event Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                                    placeholder="Give it a short, distinct name"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.title}</p>
                            </div>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Description</label>
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                                    placeholder="Tell people what your event is about..."
                                    error={!!errors.description}
                                />
                                <p className={styles.errorMessage}>{errors.description}</p>
                            </div>

                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Category</label>
                                <select
                                    name="category"
                                    className={styles.selectInput}
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Tags</label>
                                <div className={styles.tagContainer}>
                                    <div className={styles.tagInputWrapper}>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="Add keywords (press Enter)..."
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className={styles.generateBtn} onClick={handleAddTag}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line></svg>
                                            Generate
                                        </button>
                                    </div>

                                    {formData.tags.length > 0 && (
                                        <div className={styles.tagList}>
                                            {formData.tags.map(tag => (
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

                {/* 3. Time */}
                {activeTab === 'time' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Date & Time</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    className={`${styles.input} ${errors.startDate ? styles.inputError : ''}`}
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.startDate}</p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Start Time</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.startTime}</p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    className={`${styles.input} ${errors.endDate ? styles.inputError : ''}`}
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.endDate}</p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>End Time</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                />
                                <p className={styles.errorMessage}>{errors.endTime}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. Place */}
                {activeTab === 'place' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Location</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Is this an Online Event?</label>
                                <div className={styles.toggleRow}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={formData.isOnline}
                                            onChange={() => handleToggle('isOnline')}
                                        />
                                        Yes, it's an online event
                                    </label>
                                </div>
                            </div>

                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>{formData.isOnline ? 'Meeting Link' : 'Venue Location'}</label>
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

                {/* 5. Tickets (Separate) */}
                {activeTab === 'tickets' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Tickets</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Total Capacity</label>
                                <input
                                    type="number"
                                    name="limit"
                                    className={styles.input}
                                    placeholder="Unlimited"
                                    value={formData.limit}
                                    onChange={handleInputChange}
                                />
                                <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px' }}>
                                    Maximum number of attendees allowed. Leave blank for unlimited.
                                </p>
                            </div>

                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <div className={styles.toggleRow}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={formData.isPaid}
                                            onChange={() => handleToggle('isPaid')}
                                        />
                                        <strong>Paid Event</strong> (Requires tickets)
                                    </label>
                                </div>
                                <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px', marginLeft: '32px' }}>
                                    If unchecked, the event will be free for all attendees.
                                </p>
                            </div>
                        </div>

                        {formData.isPaid && (
                            <div style={{ marginTop: '24px' }}>
                                <div className={styles.ticketList}>
                                    {formData.tickets.map((ticket, index) => (
                                        <div key={index} className={styles.ticketItem}>
                                            <div className={styles.ticketRow}>
                                                <div className={styles.inputGroup} style={{ flex: 2 }}>
                                                    <label className={styles.label}>Ticket Name</label>
                                                    <input
                                                        type="text"
                                                        className={`${styles.input} ${errors[`tickets.${index}.name`] ? styles.inputError : ''}`}
                                                        placeholder="e.g. VIP Admission"
                                                        value={ticket.name}
                                                        onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                                                    />
                                                    <p className={styles.errorMessage}>{errors[`tickets.${index}.name`]}</p>
                                                </div>
                                                <div className={styles.inputGroup} style={{ flex: 1 }}>
                                                    <label className={styles.label}>Price</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`${styles.input} ${errors[`tickets.${index}.price`] ? styles.inputError : ''}`}
                                                        placeholder="0.00"
                                                        value={ticket.price}
                                                        onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                                                    />
                                                    <p className={styles.errorMessage}>{errors[`tickets.${index}.price`]}</p>
                                                </div>
                                                <div className={styles.inputGroup} style={{ flex: 1 }}>
                                                    <label className={styles.label}>Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className={`${styles.input} ${errors[`tickets.${index}.quantity`] ? styles.inputError : ''}`}
                                                        placeholder="100"
                                                        value={ticket.quantity}
                                                        onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)}
                                                    />
                                                    <p className={styles.errorMessage}>{errors[`tickets.${index}.quantity`]}</p>
                                                </div>
                                                <button className={styles.removeBtn} onClick={() => removeTicket(index)} title="Remove Ticket">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>

                                            <div className={styles.ticketAdvanced}>
                                                <div className={`${styles.inputGroup} ${styles.ticketDescription}`}>
                                                    <label className={styles.label}>Description (Optional)</label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        placeholder="What's included in this ticket?"
                                                        value={ticket.description || ''}
                                                        onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Sale Start</label>
                                                    <input
                                                        type="datetime-local"
                                                        className={styles.input}
                                                        value={ticket.saleStart || ''}
                                                        onChange={(e) => handleTicketChange(index, 'saleStart', e.target.value)}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Sale End</label>
                                                    <input
                                                        type="datetime-local"
                                                        className={`${styles.input} ${errors[`tickets.${index}.saleEnd`] ? styles.inputError : ''}`}
                                                        value={ticket.saleEnd || ''}
                                                        onChange={(e) => handleTicketChange(index, 'saleEnd', e.target.value)}
                                                    />
                                                    <p className={styles.errorMessage}>{errors[`tickets.${index}.saleEnd`]}</p>
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Max Per Order</label>
                                                    <input
                                                        type="number"
                                                        className={`${styles.input} ${errors[`tickets.${index}.maxPerOrder`] ? styles.inputError : ''}`}
                                                        placeholder="10"
                                                        value={ticket.maxPerOrder || ''}
                                                        onChange={(e) => handleTicketChange(index, 'maxPerOrder', e.target.value)}
                                                    />
                                                    <p className={styles.errorMessage}>{errors[`tickets.${index}.maxPerOrder`]}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button className={styles.addTicketBtn} onClick={addTicket}>+ Add Ticket Type</button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* 5. Settings (Separate) */}
                {activeTab === 'settings' && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Event Settings</h2>
                        <div className={styles.formGrid}>
                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                <div className={styles.toggleRow} style={{ marginBottom: '16px' }}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={formData.isPrivate}
                                            onChange={() => handleToggle('isPrivate')}
                                        />
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
