"use client";

import React, { useState } from 'react';
import styles from './CreateEventForm.module.css';

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

    const categories = ['General', 'Tech', 'Social', 'Art', 'Music', 'Fitness'];

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
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
        // TODO: Integrate Supabase DB Insert
        console.log('Submitting Event:', {
            title, description, category, tags, coverUrl,
            isOnline, location, startDate, endDate,
            isPrivate, isPaid, limit, ticketTypes
        });
        alert('Event Created! (Mock)');
        // router.push('/dashboard/events');
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
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`${styles.chip} ${category === cat ? styles.chipSelected : ''}`}
                                        onClick={() => setCategory(cat)}
                                    >
                                        {cat}
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
                                <button type="button" className={styles.addBtn} onClick={handleAddTag}>Add</button>
                            </div>
                            <div className={styles.tagList}>
                                {tags.map(tag => (
                                    <span key={tag} className={styles.tagPill}>
                                        {tag}
                                        <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                                    </span>
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
                                                <span className={styles.ticketPrice}>${ticket.price}</span>
                                            </div>
                                            <button type="button" onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== idx))} className={styles.deleteBtn}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.btnRow}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setStep(2)}>Back</button>
                            <button type="submit" className={styles.submitBtn}>Create Event</button>
                        </div>
                    </div>
                )}
            </form>

            {/* Simple Modal for Adding Tickets */}
            {showTicketModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Add Ticket Tier</h3>
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
