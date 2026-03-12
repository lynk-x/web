"use client";

/**
 * useEventForm — centralised state and business logic for the EventForm.
 *
 * Extracted from EventForm.tsx to reduce its length and make each concern
 * independently testable. The hook owns:
 * - Form data state and dirty-checking
 * - Draft persistence (localStorage)
 * - Cover image state
 * - Tag suggestion state
 * - Supabase data fetching (tags, categories, feature flags)
 * - Validation
 * - Submit orchestration
 */

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { OrganizerEventFormData as EventData, OrganizerEventTicket as Ticket } from '@/types/organize';

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_FORM_DATA: EventData = {
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
    isPrivate: false,
    isPaid: false,
    limit: '',
    tickets: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type EventFormTab = 'cover' | 'basics' | 'category' | 'time' | 'place' | 'tickets' | 'settings';

interface UseEventFormOptions {
    initialData?: Partial<EventData>;
    isEditMode?: boolean;
    onSubmit: (data: EventData, file?: File | null) => Promise<void>;
}

export function useEventForm({ initialData, isEditMode = false, onSubmit }: UseEventFormOptions) {
    // ── Form State ────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState<EventData>({ ...DEFAULT_FORM_DATA });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<EventFormTab>('cover');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // ── Image State ───────────────────────────────────────────────────────────
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
        initialData?.thumbnailUrl || null
    );

    // ── Tag State ─────────────────────────────────────────────────────────────
    const [tagInput, setTagInput] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState<{ id: string; name: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // ── Reference Data ────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<{ id: string; display_name: string }[]>([]);
    const [isPaidTicketingEnabled, setIsPaidTicketingEnabled] = useState(true);

    // ── Draft ─────────────────────────────────────────────────────────────────
    const [draft, setDraft] = useLocalStorage<EventData | null>('event_draft', null);

    // ── Load Initial Data / Draft ─────────────────────────────────────────────
    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({ ...prev, ...initialData }));
            if (initialData.thumbnailUrl) setThumbnailPreview(initialData.thumbnailUrl);
        } else if (!isEditMode && draft) {
            setFormData((prev) => ({ ...prev, ...draft }));
            setIsDraftLoaded(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, isEditMode]);

    // ── Fetch Tags, Categories & Feature Flags ────────────────────────────────
    useEffect(() => {
        const fetchReferenceData = async () => {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();

            const [tagsRes, catsRes, flagRes] = await Promise.all([
                supabase.from('tags').select('id, name'),
                supabase.from('event_categories').select('id, display_name').order('display_name'),
                supabase.from('feature_flags').select('is_enabled').eq('key', 'paid_ticketing').single(),
            ]);

            if (tagsRes.data) setTagSuggestions(tagsRes.data);
            if (catsRes.data) setCategories(catsRes.data);
            if (flagRes.data) setIsPaidTicketingEnabled(flagRes.data.is_enabled);
        };

        fetchReferenceData();
    }, []);

    // ── Dirty Check & Draft Auto-Save ─────────────────────────────────────────
    useEffect(() => {
        const dirty =
            formData.title !== (initialData?.title || '') ||
            formData.description !== (initialData?.description || '') ||
            formData.location !== (initialData?.location || '') ||
            formData.tickets.length !== (initialData?.tickets?.length || 0);

        setIsDirty(dirty);

        // Guard unsaved changes
        if (dirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }

        // Auto-save draft (debounced 1s)
        if (!isEditMode && formData.title) {
            const id = setTimeout(() => setDraft(formData), 1000);
            return () => clearTimeout(id);
        }
    }, [formData, isEditMode, initialData, setDraft]);

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const next: Record<string, string> = {};

        if (!formData.title.trim()) next.title = 'Event title is required';
        if (!formData.description.trim()) next.description = 'Description is required';
        if (!formData.category) next.category = 'Category is required';
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

        if (formData.isPaid) {
            formData.tickets.forEach((ticket, i) => {
                if (!ticket.display_name.trim()) next[`tickets.${i}.display_name`] = 'Ticket name is required';
                if (!ticket.price || parseFloat(ticket.price) < 0) next[`tickets.${i}.price`] = 'Price must be a positive number';
                if (!ticket.capacity || parseInt(ticket.capacity) <= 0) next[`tickets.${i}.capacity`] = 'Quantity must be a positive integer';
                if (ticket.saleStart && ticket.saleEnd) {
                    const s = new Date(ticket.saleStart);
                    const e = new Date(ticket.saleEnd);
                    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e <= s) {
                        next[`tickets.${i}.saleEnd`] = 'Sale end must be after sale start';
                    }
                }
                if (ticket.maxPerOrder) {
                    const m = parseInt(ticket.maxPerOrder);
                    if (m <= 0) next[`tickets.${i}.maxPerOrder`] = 'Max per order must be positive';
                    if (ticket.capacity && m > parseInt(ticket.capacity)) {
                        next[`tickets.${i}.maxPerOrder`] = 'Cannot exceed total quantity';
                    }
                }
            });
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!validate()) {
            // Navigate to the first tab that has an error
            if (errors.thumbnailUrl) setActiveTab('cover');
            else if (errors.title || errors.description) setActiveTab('basics');
            else if (errors.category) setActiveTab('category');
            else if (errors.startDate || errors.endDate || errors.startTime || errors.endTime) setActiveTab('time');
            else if (errors.location) setActiveTab('place');
            else if (Object.keys(errors).some((k) => k.startsWith('tickets'))) setActiveTab('tickets');
            return;
        }

        setLoading(true);
        await onSubmit(formData, thumbnailFile);
        setLoading(false);
    };

    // ── Field Helpers ─────────────────────────────────────────────────────────

    /** Generic input change — clears the corresponding field error. */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        }
    };

    const handleToggle = (field: keyof EventData) => {
        setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    // ── Cover Image ───────────────────────────────────────────────────────────
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setThumbnailFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            const url = reader.result as string;
            setThumbnailPreview(url);
            setFormData((prev) => ({ ...prev, thumbnailUrl: url }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setFormData((prev) => ({ ...prev, thumbnailUrl: '' }));
    };

    // ── Tags ──────────────────────────────────────────────────────────────────
    const filteredSuggestions = tagSuggestions
        .filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !formData.tags.includes(t.name))
        .slice(0, 5);

    const handleAddTag = (name?: string) => {
        const tag = (name || tagInput).trim();
        if (tag && !formData.tags.includes(tag)) {
            setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
            setTagInput('');
            setShowSuggestions(false);
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
        else if (e.key === 'Escape') setShowSuggestions(false);
    };

    // ── Tickets ───────────────────────────────────────────────────────────────
    const handleTicketChange = (index: number, field: keyof Ticket, value: string) => {
        const updated = [...formData.tickets];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({ ...prev, tickets: updated }));
        const key = `tickets.${index}.${field}`;
        if (errors[key]) {
            setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
        }
    };

    const addTicket = () => {
        setFormData((prev) => ({
            ...prev,
            tickets: [...prev.tickets, { display_name: '', price: '', capacity: '' }],
        }));
    };

    const removeTicket = (index: number) => {
        setFormData((prev) => ({ ...prev, tickets: prev.tickets.filter((_, i) => i !== index) }));
    };

    // ── Draft ─────────────────────────────────────────────────────────────────
    const discardDraft = () => {
        if (confirm('Are you sure you want to discard your draft? This cannot be undone.')) {
            setDraft(null);
            window.location.reload();
        }
    };

    return {
        // State
        formData, errors, loading, activeTab, setActiveTab,
        isDraftLoaded, isDirty,
        thumbnailFile, thumbnailPreview,
        tagInput, setTagInput, filteredSuggestions, showSuggestions, setShowSuggestions,
        categories, isPaidTicketingEnabled,

        // Handlers
        handleInputChange, handleToggle,
        handleImageSelect, handleRemoveImage,
        handleAddTag, handleRemoveTag, handleTagKeyDown,
        handleTicketChange, addTicket, removeTicket,
        handleSubmit, discardDraft,
        setFormData,
    };
}
