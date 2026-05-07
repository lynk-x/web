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

    // Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [pendingImage, setPendingImage] = useState<string | null>(null);

    /**
     * Reads the selected file into a data URL and exposes it as a preview.
     * The raw File is retained so the upload step in handleSubmit can PUT it
     * to Supabase Storage instead of re-encoding the data URL.
     */
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setPendingImage(reader.result as string);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
        
        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setIsLoadingMedia(true);
        
        // Convert Blob to File
        const file = new File([croppedBlob], 'event-cover.jpg', { type: 'image/jpeg' });
        setThumbnailFile(file);

        // Create preview URL
        const url = URL.createObjectURL(croppedBlob);
        setThumbnailPreview(url);
        onUrlChange(url);
        
        setIsCropperOpen(false);
        setPendingImage(null);
        setIsLoadingMedia(false);
    };

    const handleCloseCropper = () => {
        setIsCropperOpen(false);
        setPendingImage(null);
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
        isCropperOpen,
        pendingImage,
        handleCropComplete,
        handleCloseCropper,
    };
}
