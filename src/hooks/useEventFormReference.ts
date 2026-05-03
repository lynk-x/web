"use client";

/**
 * useEventFormReference — Remote data fetching for the event form.
 *
 * Extracted from useEventForm.ts (P3 refactor). Owns all Supabase queries
 * that populate the form's dropdown and tag-suggestion UI. Keeping this
 * separate means the form's mutable state (useEventFormData) is never
 * tangled with async fetch operations and is independently testable with mocks.
 *
 * Provides:
 * - categories list (for the category picker)
 * - tagSuggestions (for the tag autocomplete)
 * - categoryTags mapping (for prioritising category-specific tags)
 * - popularTags — derived list that puts category-matched tags first
 */

import { useState, useEffect, useMemo } from 'react';
import type { EventCategory, Tag, CategoryTag as RepoCategoryTag } from '@/lib/repositories/reference.repository';

interface Category { id: string; display_name: string; }
interface TagSuggestion { id: string; name: string; }
interface CategoryTag { category_id: string; tag_id: string; }

interface UseEventFormReferenceOptions {
  /** The currently selected category ID; used to derive popularTags. */
  selectedCategory: string;
  /** The current tag search input value; used to filter popularTags. */
  tagInput: string;
  /** Tags already added to the form; used to avoid duplicate suggestions. */
  selectedTags: string[];
}

export function useEventFormReference({
  selectedCategory,
  tagInput,
  selectedTags,
}: UseEventFormReferenceOptions) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
    const [categoryTags, setCategoryTags] = useState<CategoryTag[]>([]);
    const [isLoadingReference, setIsLoadingReference] = useState(true);
    const [error, setError] = useState<{ message: string; code?: string } | null>(null);

    useEffect(() => {
        const fetchReferenceData = async () => {
            setIsLoadingReference(true);
            setError(null);
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const { createReferenceRepository } = await import('@/lib/repositories');
                const refRepo = createReferenceRepository(createClient());

                const [tagsRes, catsRes, catTagsRes] = await Promise.all([
                    refRepo.getTags(),
                    refRepo.getEventCategories(),
                    refRepo.getCategoryTags(),
                ]);

                if (tagsRes.error) console.error('Error fetching tags:', tagsRes.error);
                if (catsRes.error) console.error('Error fetching categories:', catsRes.error);
                if (catTagsRes.error) console.error('Error fetching category tags:', catTagsRes.error);

                const firstError = tagsRes.error || catsRes.error || catTagsRes.error;
                if (firstError) setError(firstError);

                if (tagsRes.data) {
                    setTagSuggestions(tagsRes.data.map((t) => ({ id: t.id, name: t.name })));
                }
                if (catsRes.data) {
                    setCategories(catsRes.data.map((c) => ({ id: c.id, display_name: c.display_name })));
                }
                if (catTagsRes.data) {
                    setCategoryTags(catTagsRes.data);
                }
            } catch (err) {
                console.error('Unexpected error in useEventFormReference:', err);
                setError(err instanceof Error ? err : new Error('Failed to load reference data'));
            } finally {
                setIsLoadingReference(false);
            }
        };

        fetchReferenceData();
    }, []);

    /** Tags for the current category come first; remaining tags fill the rest. */
    const popularTags = useMemo(() => {
        const categorySpecificTagIds = categoryTags
            .filter(ct => ct.category_id === selectedCategory)
            .map(ct => ct.tag_id);

        const categorySpecificTags = tagSuggestions
            .filter(t => categorySpecificTagIds.includes(t.id))
            .map(t => t.name);

        const allTagNames = tagSuggestions.map(t => t.name);
        const combined = Array.from(new Set([...categorySpecificTags, ...allTagNames]));

        return combined
            .filter(name => !selectedTags.includes(name))         // hide already-selected
            .filter(name => !tagInput || name.toLowerCase().includes(tagInput.toLowerCase()))
            .slice(0, 15);
    }, [tagSuggestions, categoryTags, selectedCategory, tagInput, selectedTags]);

    return {
        categories,
        tagSuggestions,
        categoryTags,
        popularTags,
        isLoadingReference,
        error,
        hasCategorySpecificTags: categoryTags.some(ct => ct.category_id === selectedCategory),
    };
}
