"use client";

/**
 * useEventFormData — Form state, dirty-checking, and draft persistence.
 *
 * Extracted from useEventForm.ts (P3 refactor) to isolate mutable form data
 * from the data-fetching and validation concerns. This hook is the single
 * source of truth for the form's current values and lifecycle flags.
 *
 * Responsibilities:
 * - Holds formData, errors, loading, activeTab
 * - Loads initialData or persisted draft on mount
 * - Auto-saves draft to localStorage (debounced 1 s)
 * - Fires beforeunload guard when there are unsaved changes
 */

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { OrganizerEventFormData as EventData } from '@/types/organize';

export type EventFormTab = 'cover' | 'basics' | 'category' | 'time' | 'place' | 'tickets' | 'settings';

export const DEFAULT_FORM_DATA: EventData = {
    title: '',
    description: '',
    category: 'arts-entertainment',
    tags: [],
    thumbnailUrl: '',
    isOnline: false,
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: 'UTC',
    isPrivate: false,
    isPaid: true,
    tickets: [{ display_name: 'General Admission', price: '0', capacity: '100' }],
    currency: 'USD',
};

interface UseEventFormDataOptions {
    initialData?: Partial<EventData>;
    isEditMode?: boolean;
}

export function useEventFormData({ initialData, isEditMode = false }: UseEventFormDataOptions) {
    const [formData, setFormData] = useState<EventData>(() => ({
        ...DEFAULT_FORM_DATA,
        timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
    }));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<EventFormTab>('cover');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [draft, setDraft] = useLocalStorage<EventData | null>('event_draft', null);
    const hasDraft = !isEditMode && !!draft;

    // Load initial data on mount (but NOT the draft)
    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({ ...prev, ...initialData }));
        }
         
    }, [initialData, isEditMode]);

    /** Manually apply the saved draft to the form. */
    const applyDraft = () => {
        if (draft) {
            // Sanitize draft: remove deprecated fields from tickets
            const sanitizedTickets = (draft.tickets || []).map((t: any) => {
                const { has_premium_upsell, ...rest } = t;
                return rest;
            });
            setFormData((prev) => ({ ...prev, ...draft, tickets: sanitizedTickets }));
            setIsDraftLoaded(true);
        }
    };

    // Dirty check, beforeunload guard, and auto-save draft
    useEffect(() => {
        const dirty =
            formData.title !== (initialData?.title || '') ||
            formData.description !== (initialData?.description || '') ||
            formData.location !== (initialData?.location || '') ||
            formData.tickets.length !== (initialData?.tickets?.length || 0);

        setIsDirty(dirty);

        if (dirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }

        if (!isEditMode && formData.title) {
            const id = setTimeout(() => setDraft(formData), 1000);
            return () => clearTimeout(id);
        }
    }, [formData, isEditMode, initialData, setDraft]);

    const discardDraft = () => {
        setDraft(null);
        if (isDraftLoaded) window.location.reload();
    };

    return {
        formData, setFormData,
        errors, setErrors,
        loading, setLoading,
        activeTab, setActiveTab,
        isDraftLoaded, isDirty,
        hasDraft, applyDraft,
        discardDraft,
    };
}
