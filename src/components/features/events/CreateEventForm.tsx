"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './CreateEventForm.module.css';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface TicketType {
    name: string;
    price: number;
    capacity?: number;
}

const CreateEventForm = () => {
    const [step, setStep] = useState(1);

    // Step 1: Basics
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [coverUrl,] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount } = useOrganization();
    const router = useRouter();

    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatPrice = (price: number) => {
        const currency = activeAccount?.wallet_currency || 'KES';
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: currency,
            }).format(price);
        } catch (e) {
            return `${currency} ${price.toFixed(2)}`;
        }
    };
    const [realCategories, setRealCategories] = useState<{id: string, display_name: string}[]>([]);

    // Tag Suggestions State
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

    // Fetch Tag Suggestions & Categories
    useEffect(() => {
        const fetchData = async () => {
            // Fetch tags
            const { data: tagData } = await supabase
                .from('tags')
                .select('id, name')
                .eq('is_active', true)
                .order('use_count', { ascending: false })
                .limit(12);
            if (tagData) setTagSuggestions(tagData.map(t => t.name));

            // Fetch categories
            const { data: catData } = await supabase
                .from('event_categories')
                .select('id, display_name')
                .eq('is_active', true);
            if (catData) {
                setRealCategories(catData);
                if (catData.length > 0) setCategory(catData[0].id);
            }
        };
        fetchData();
    }, [supabase]);

    // Step 2: Logistics
    const [isOnline, setIsOnline] = useState(false);
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Step 3: Settings
    const [isPrivate, setIsPrivate] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [limit, setLimit] = useState('');
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

    // Ticket Modal State
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [newTicket, setNewTicket] = useState<TicketType>({ name: '', price: 0 });

    // const categories = ['General', 'Tech', 'Social', 'Art', 'Music', 'Fitness'];

    const handleAddTag = (tag?: string) => {
        const value = (tag || tagInput).trim();
        if (value && !tags.includes(value)) {
            setTags([...tags, value]);
            setTagInput('');
        }
    };

    const handleAddTicket = () => {
        if (newTicket.name && newTicket.price >= 0) {
            setTicketTypes([...ticketTypes, newTicket]);
            setNewTicket({ name: '', price: 0 });
            setShowTicketModal(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) {
            showToast('Please select an active organization first.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert Event
            const { data: event, error: eventError } = await supabase
                .from('events')
                .insert({
                    account_id: activeAccount.id,
                    category_id: category,
                    title,
                    description,
                    starts_at: startDate,
                    ends_at: endDate,
                    is_online: isOnline,
                    virtual_link: isOnline ? location : null,
                    location: !isOnline ? { name: location } : null,
                    is_private: isPrivate,
                    currency: activeAccount.wallet_currency || 'KES',
                    status: 'published' // Default to published for now
                })
                .select()
                .single();

            if (eventError) throw eventError;

            // 2. Handle Tags (Upsert approach)
            if (tags.length > 0) {
                // First, ensure all tags exist in the tags table (or get their IDs)
                for (const tagName of tags) {
                    const slug = tagName.toLowerCase().replace(/\s+/g, '-');
                    // We try to insert unique tags, on conflict we do nothing but we need the ID
                    const { data: tagObj } = await supabase
                        .from('tags')
                        .upsert({ name: tagName, slug: slug }, { onConflict: 'slug' })
                        .select('id')
                        .single();
                    
                    if (tagObj) {
                        await supabase.from('event_tags').insert({
                            event_id: event.id,
                            tag_id: tagObj.id
                        });
                    }
                }
            }

            // 3. Insert Ticket Tiers
            if (ticketTypes.length > 0) {
                const tiers = ticketTypes.map(t => ({
                    event_id: event.id,
                    display_name: t.name,
                    price: t.price,
                    capacity: t.capacity || 100 // Default capacity if not set
                }));
                const { error: tierError } = await supabase.from('ticket_tiers').insert(tiers);
                if (tierError) throw tierError;
            }

            showToast('Event created successfully!', 'success');
            router.push('/dashboard/organize');
        } catch (error: unknown) {
            console.error('Error creating event:', error);
            showToast(getErrorMessage(error) || 'Failed to create event.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Progress Steps */}
            <div className={styles.progressContainer}>
                <div className={`${styles.step} ${step >= 1 ? styles.activeStep : ''}`} onClick={() => setStep(1)}>1. Basics</div>
                <div className={styles.line}></div>
                <div className={`${styles.step} ${step >= 2 ? styles.activeStep : ''}`} onClick={() => setStep(2)}>2. Logistics</div>
                <div className={styles.line}></div>
                <div className={`${styles.step} ${step >= 3 ? styles.activeStep : ''}`} onClick={() => setStep(3)}>3. Settings</div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>

                {/* STEP 1: BASICS */}
                {step === 1 && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.stepTitle}>Event Basics</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Event Title</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="What is it called?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Tell the world..."
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Category</label>
                            <div className={styles.chipGrid}>
                                {realCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        className={`${styles.chip} ${category === cat.id ? styles.chipSelected : ''}`}
                                        onClick={() => setCategory(cat.id)}
                                    >
                                        {cat.display_name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Tags</label>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Add a tag..."
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                />
                                <button type="button" className={styles.addBtn} onClick={() => handleAddTag()}>Add</button>
                            </div>
                            <div className={styles.tagList}>
                                {tags.map(tag => (
                                    <span key={tag} className={styles.tagPill}>
                                        {tag}
                                        <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                                    </span>
                                ))}
                            </div>
                            <div className={styles.tagSuggestions}>
                                {tagSuggestions.filter(t => !tags.includes(t)).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        className={styles.tagSuggestion}
                                        onClick={() => handleAddTag(t)}
                                    >
                                        + {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="button" className={styles.primaryBtn} onClick={() => setStep(2)}>Next: Logistics</button>
                    </div>
                )}

                {/* STEP 2: LOGISTICS */}
                {step === 2 && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.stepTitle}>Time & Place</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Is this an Online Event?</label>
                            <div className={styles.toggleRow}>
                                <span>{isOnline ? 'Yes, Online' : 'No, In-Person'}</span>
                                <input
                                    type="checkbox"
                                    checked={isOnline}
                                    onChange={(e) => setIsOnline(e.target.checked)}
                                    className={styles.toggle}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{isOnline ? 'Meeting Link' : 'Location'}</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder={isOnline ? 'Zoom/Meet Link...' : 'Where is it?'}
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Start Date</label>
                                <input
                                    type="datetime-local"
                                    className={styles.input}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>End Date</label>
                                <input
                                    type="datetime-local"
                                    className={styles.input}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.btnRow}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setStep(1)}>Back</button>
                            <button type="button" className={styles.primaryBtn} onClick={() => setStep(3)}>Next: Settings</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: SETTINGS */}
                {step === 3 && (
                    <div className={styles.stepContent}>
                        <h2 className={styles.stepTitle}>Final Details</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                Private Event (Invite Only)
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={isPaid}
                                    onChange={(e) => setIsPaid(e.target.checked)}
                                />
                                Paid Event
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Attendance Limit</label>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="Unlimited"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                            />
                        </div>

                        {isPaid && (
                            <div className={styles.ticketSection}>
                                <div className={styles.sectionHeader}>
                                    <h3 className={styles.label}>Ticket Tiers</h3>
                                    <button type="button" className={styles.addBtnSmall} onClick={() => setShowTicketModal(true)}>+ Add Tier</button>
                                </div>

                                {ticketTypes.length === 0 && <p className={styles.emptyState}>No tickets defined yet.</p>}

                                <div className={styles.ticketList}>
                                    {ticketTypes.map((ticket, idx) => (
                                        <div key={idx} className={styles.ticketItem}>
                                            <div className={styles.ticketInfo}>
                                                <span className={styles.ticketName}>{ticket.name}</span>
                                                <span className={styles.ticketPrice}>{formatPrice(ticket.price)}</span>
                                            </div>
                                            <button type="button" onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== idx))} className={styles.deleteBtn}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.btnRow}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setStep(2)}>Back</button>
                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* Simple Modal for Adding Tickets */}
            {showTicketModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Add Ticket Tier ({activeAccount?.wallet_currency || 'KES'})</h3>
                        <input
                            className={styles.input}
                            placeholder="Name (e.g. VIP)"
                            value={newTicket.name}
                            onChange={e => setNewTicket({ ...newTicket, name: e.target.value })}
                        />
                        <input
                            className={styles.input}
                            type="number"
                            placeholder="Price"
                            value={newTicket.price}
                            onChange={e => setNewTicket({ ...newTicket, price: parseFloat(e.target.value) })}
                        />
                        <div className={styles.btnRow}>
                            <button onClick={() => setShowTicketModal(false)} className={styles.secondaryBtn}>Cancel</button>
                            <button onClick={handleAddTicket} className={styles.primaryBtn}>Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateEventForm;
