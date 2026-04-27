"use client";

/**
 * useEventForm — Composition facade for the EventForm.
 *
 * After the P3 refactor this hook no longer holds any state itself.
 * It delegates to three focused sub-hooks:
 *
 *  1. useEventFormData    — form values, errors, dirty flag, draft lifecycle
 *  2. useEventFormReference — DB lookups (tags, categories), popularTags memoization
 *  3. useEventFormMedia   — cover image file + preview URL
 *
 * The module re-exports the return shape that EventForm.tsx already consumes,
 * so no changes to the component are required.
 *
 * Validation and submit orchestration live here because they need fields
 * from all three sub-hooks simultaneously.
 */

import { useState } from 'react';
import { sanitizeInput } from '@/utils/sanitization';
import type { OrganizerEventFormData as EventData, OrganizerEventTicket as Ticket } from '@/types/organize';

import { useEventFormData, EventFormTab } from './useEventFormData';
import { useEventFormReference } from './useEventFormReference';
import { useEventFormMedia } from './useEventFormMedia';

export type { EventFormTab };

interface UseEventFormOptions {
    initialData?: Partial<EventData>;
    isEditMode?: boolean;
    onSubmit: (data: EventData, file?: File | null) => Promise<void>;
}

export function useEventForm({ initialData, isEditMode = false, onSubmit }: UseEventFormOptions) {
    // ── Sub-hook 1: form state, dirty check, draft ─────────────────────────────
    const {
        formData, setFormData,
        errors, setErrors,
        loading, setLoading,
        activeTab, setActiveTab,
        isDraftLoaded, isDirty,
        hasDraft, applyDraft,
        discardDraft,
    } = useEventFormData({ initialData, isEditMode });

    // ── Sub-hook 2: reference data & tag suggestions ───────────────────────────
    const [tagInput, setTagInput] = useState('');

    const {
        categories,
        popularTags,
        hasCategorySpecificTags,
        isLoadingReference,
        error: referenceError,
    } = useEventFormReference({
        selectedCategory: formData.category,
        tagInput,
        selectedTags: formData.tags,
    });

    // ── Sub-hook 3: cover image ────────────────────────────────────────────────
    const {
        thumbnailFile,
        thumbnailPreview,
        handleImageSelect,
        handleRemoveImage,
    } = useEventFormMedia({
        initialUrl: initialData?.thumbnailUrl,
        onUrlChange: (url) => setFormData((prev) => ({ ...prev, thumbnailUrl: url })),
    });

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const next: Record<string, string> = {};

        if (!formData.title.trim()) next.title = 'Event title is required';
        if (!formData.description.trim()) next.description = 'Description is required';
        if (!formData.category) next.category = 'Category is required';
        if (formData.tags.length === 0) next.tags = 'At least one tag is required';
        if (!formData.thumbnailUrl && !thumbnailPreview) next.thumbnailUrl = 'Cover image is required';
        if (!formData.startDate) next.startDate = 'Start date is required';
        if (!formData.startTime) next.startTime = 'Start time is required';
        if (!formData.endDate) next.endDate = 'End date is required';
        if (!formData.endTime) next.endTime = 'End time is required';

        if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);
            if (end < start) next.endDate = 'End date/time cannot be before start date/time';
        }

        if (!formData.isOnline && !formData.location.trim()) {
            next.location = 'Location is required for in-person events';
        }

        formData.tickets.forEach((ticket, i) => {
            if (!ticket.display_name.trim()) next[`tickets.${i}.display_name`] = 'Ticket name is required';
            if (!ticket.price || parseFloat(ticket.price) < 0) next[`tickets.${i}.price`] = 'Price must be 0 or more';
            if (!ticket.capacity || parseInt(ticket.capacity) <= 0) next[`tickets.${i}.capacity`] = 'Quantity must be a positive integer';
        });

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    /**
     * validateTab — validates only the fields on the current tab.
     * Used to prevent "forward" navigation if the current section is incomplete.
     */
    const validateTab = (tab: EventFormTab): boolean => {
        const next: Record<string, string> = { ...errors };
        let hasError = false;

        const clearError = (field: string) => delete next[field];
        const setError = (field: string, msg: string) => { next[field] = msg; hasError = true; };

        if (tab === 'cover') {
            if (!formData.thumbnailUrl && !thumbnailPreview) setError('thumbnailUrl', 'Cover image is required');
            else clearError('thumbnailUrl');
        }

        if (tab === 'basics') {
            if (!formData.title.trim()) setError('title', 'Event title is required');
            else clearError('title');
            if (!formData.description.trim()) setError('description', 'Description is required');
            else clearError('description');
        }

        if (tab === 'category') {
            if (!formData.category) setError('category', 'Category is required');
            else clearError('category');
            if (formData.tags.length === 0) setError('tags', 'At least one tag is required');
            else clearError('tags');
        }

        if (tab === 'time') {
            if (!formData.startDate) setError('startDate', 'Start date is required'); else clearError('startDate');
            if (!formData.startTime) setError('startTime', 'Start time is required'); else clearError('startTime');
            if (!formData.endDate) setError('endDate', 'End date is required'); else clearError('endDate');
            if (!formData.endTime) setError('endTime', 'End time is required'); else clearError('endTime');

            if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
                const start = new Date(`${formData.startDate}T${formData.startTime}`);
                const end = new Date(`${formData.endDate}T${formData.endTime}`);
                if (end < start) setError('endDate', 'End date/time cannot be before start date/time');
            }
        }

        if (tab === 'place') {
            if (!formData.isOnline && !formData.location.trim()) setError('location', 'Location is required for in-person events');
            else clearError('location');
        }

        if (tab === 'tickets') {
            formData.tickets.forEach((ticket, i) => {
                const dn = `tickets.${i}.display_name`;
                const pr = `tickets.${i}.price`;
                const cp = `tickets.${i}.capacity`;
                if (!ticket.display_name.trim()) setError(dn, 'Ticket name is required'); else clearError(dn);
                if (!ticket.price || parseFloat(ticket.price) < 0) setError(pr, 'Price must be 0 or more'); else clearError(pr);
                if (!ticket.capacity || parseInt(ticket.capacity) <= 0) setError(cp, 'Quantity must be a positive integer'); else clearError(cp);
            });
        }

        setErrors(next);
        return !hasError;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (overrideStatus?: 'draft' | 'published') => {
        if (!validate()) {
            // Navigate to the first tab with an error
            if (errors.thumbnailUrl) setActiveTab('cover');
            else if (errors.title || errors.description) setActiveTab('basics');
            else if (errors.category) setActiveTab('category');
            else if (errors.startDate || errors.endDate || errors.startTime || errors.endTime) setActiveTab('time');
            else if (errors.location) setActiveTab('place');
            else if (Object.keys(errors).some((k) => k.startsWith('tickets'))) setActiveTab('tickets');
            return;
        }

        setLoading(true);
        const finalData = { ...formData };
        if (overrideStatus) finalData.status = overrideStatus;
        await onSubmit(finalData, thumbnailFile);
        setLoading(false);
    };

    // ── Field Helpers ─────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: sanitizeInput(value) }));
        if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleToggle = (field: keyof EventData) => {
        setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    // ── Tags ──────────────────────────────────────────────────────────────────
    const handleAddTag = (name?: string) => {
        const tag = (name || tagInput).trim();
        if (tag && !formData.tags.includes(tag)) {
            setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
    };

    // ── Tickets ───────────────────────────────────────────────────────────────
    const handleTicketChange = (index: number, field: keyof Ticket, value: string | boolean) => {
        const updated = [...formData.tickets];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({ ...prev, tickets: updated }));
        const key = `tickets.${index}.${field}`;
        if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    };

    const addTicket = () => {
        setFormData((prev) => ({ ...prev, tickets: [...prev.tickets, { display_name: '', price: '', capacity: '' }] }));
    };

    const removeTicket = (index: number) => {
        setFormData((prev) => ({ ...prev, tickets: prev.tickets.filter((_, i) => i !== index) }));
    };

    // ── Return (same shape as before the refactor) ────────────────────────────
    return {
        formData, errors, loading, activeTab, setActiveTab,
        isDraftLoaded, isDirty,
        thumbnailFile, thumbnailPreview,
        tagInput, setTagInput,
        categories,
        popularTags,
        hasCategorySpecificTags,
        isLoadingReference,
        referenceError,

        handleInputChange, handleToggle,
        handleImageSelect, handleRemoveImage,
        handleAddTag, handleRemoveTag, handleTagKeyDown,
        handleTicketChange, addTicket, removeTicket,
        handleSubmit, discardDraft,
        validateTab,
        hasDraft, applyDraft,
        setFormData,
    };
}
