"use client";

import React, { useState, useEffect } from 'react';
import styles from './TicketForm.module.css';
import { useRouter } from 'next/navigation';
import { Ticket } from '@/types/admin';
import { useToast } from '@/components/ui/Toast';

interface TicketFormProps {
    initialData?: Partial<Ticket>;
    isEditing?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
}

export default function TicketForm({ initialData, isEditing = false, onDirtyChange }: TicketFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const defaultData = {
        subject: initialData?.subject || '',
        requester: initialData?.requester || '',
        priority: initialData?.priority || 'medium',
        status: initialData?.status || 'open',
        assignedTo: initialData?.assignedTo || '',
        description: ''
    };

    const [formData, setFormData] = useState(defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(defaultData);
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [formData, onDirtyChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (!touched[name]) {
            setTouched(prev => ({ ...prev, [name]: true }));
        }
    };

    const getInputClass = (name: string, baseClass: string) => {
        if (!touched[name]) return baseClass;
        const isValid = !!formData[name as keyof typeof formData];
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: string) => {
        if (!touched[name]) return null;
        const isValid = !!formData[name as keyof typeof formData];
        return isValid ? (
            <div className="validation-hint success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valid
            </div>
        ) : (
            <div className="validation-hint error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Required
            </div>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        showToast(isEditing ? 'Updating ticket...' : 'Creating ticket...', 'info');

        // Mock successful submission
        setTimeout(() => {
            showToast(isEditing ? 'Ticket updated successfully!' : 'Ticket created successfully!', 'success');
            onDirtyChange?.(false);
            router.push('/dashboard/admin/support');
        }, 1000);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.container}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input
                    type="text"
                    name="subject"
                    className={getInputClass('subject', styles.input)}
                    placeholder="Brief summary of the issue"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                />
                {renderValidationHint('subject')}
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Requester Name</label>
                    <input
                        type="text"
                        name="requester"
                        className={getInputClass('requester', styles.input)}
                        placeholder="John Doe"
                        value={formData.requester}
                        onChange={handleInputChange}
                        required
                    />
                    {renderValidationHint('requester')}
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Priority</label>
                    <select
                        name="priority"
                        className={styles.select}
                        value={formData.priority}
                        onChange={handleInputChange}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                        name="status"
                        className={styles.select}
                        value={formData.status}
                        onChange={handleInputChange}
                    >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Assign To</label>
                    <input
                        type="text"
                        name="assignedTo"
                        className={styles.input}
                        placeholder="Agent Name"
                        value={formData.assignedTo}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Description / Details</label>
                <textarea
                    name="description"
                    className={styles.textarea}
                    placeholder="Provide more context about the support request..."
                    value={formData.description}
                    onChange={handleInputChange}
                />
            </div>

            <div className={styles.actions}>
                <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                >
                    {isEditing ? 'Update Ticket' : 'Create Ticket'}
                </button>
            </div>
        </form>
    );
}
