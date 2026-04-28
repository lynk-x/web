"use client";

/**
 * useEventFormMedia — Cover image lifecycle for the event form.
 *
 * Extracted from useEventForm.ts (P3 refactor). Owns the File object,
 * the rendered preview URL, and the select/remove handlers. Keeping this
 * in its own hook means the image state doesn't cause the entire 316-line
 * hook to re-render whenever a user picks a photo.
 */

import { useState } from 'react';

interface UseEventFormMediaOptions {
  /** Pre-fill the preview with an existing image URL (edit mode). */
  initialUrl?: string | null;
  /** Callback to update the parent form's thumbnailUrl field. */
  onUrlChange: (url: string) => void;
}

export function useEventFormMedia({ initialUrl = null, onUrlChange }: UseEventFormMediaOptions) {
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialUrl);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    /**
     * Reads the selected file into a data URL and exposes it as a preview.
     * The raw File is retained so the upload step in handleSubmit can PUT it
     * to Supabase Storage instead of re-encoding the data URL.
     */
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoadingMedia(true);
        setThumbnailFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            const url = reader.result as string;
            setThumbnailPreview(url);
            onUrlChange(url);
            setIsLoadingMedia(false);
        };
        reader.onerror = () => {
            setIsLoadingMedia(false);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        onUrlChange('');
    };

    return {
        thumbnailFile,
        thumbnailPreview,
        isLoadingMedia,
        setIsLoadingMedia,
        handleImageSelect,
        handleRemoveImage,
    };
}
