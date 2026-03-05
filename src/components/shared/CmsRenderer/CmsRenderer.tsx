"use client";

import React from 'react';
import styles from './CmsRenderer.module.css';

interface CmsRendererProps {
    content: string;
    className?: string;
}

/**
 * Universal component to render CMS content (HTML from Tiptap)
 * applies a premium "Prose" styling system to the raw HTML.
 */
export default function CmsRenderer({ content, className = '' }: CmsRendererProps) {
    if (!content) {
        return (
            <div className={`${styles.prose} ${className}`}>
                <p>No content available.</p>
            </div>
        );
    }

    return (
        <div
            className={`${styles.prose} ${className}`}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
