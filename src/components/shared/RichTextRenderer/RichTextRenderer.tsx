"use client";

import React from 'react';
import { sanitizeRichText } from '@/utils/sanitization';
import styles from './RichTextRenderer.module.css';

interface CmsSection {
    title: string;
    body: string;
}

interface CmsContent {
    sections: CmsSection[];
}

interface RichTextRendererProps {
    content: string | CmsContent | any;
    className?: string;
}

/**
 * Universal component to render rich text/HTML content (e.g. from TipTap).
 * Supports both raw HTML strings and structured JSON sections.
 */
export default function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
    if (!content) {
        return (
            <div className={`${styles.prose} ${className}`}>
                <p>No content available.</p>
            </div>
        );
    }

    // Handle structured JSON format (array of sections)
    if (typeof content === 'object' && content.sections && Array.isArray(content.sections)) {
        return (
            <div className={`${styles.prose} ${className}`}>
                {content.sections.map((section: CmsSection, idx: number) => (
                    <div key={idx} style={{ marginBottom: idx === content.sections.length - 1 ? 0 : '40px' }}>
                        <h2 style={{ 
                            fontSize: '22px', 
                            fontWeight: '700', 
                            marginBottom: '16px',
                            color: 'var(--color-utility-primaryText)',
                            fontFamily: 'var(--font-heading)'
                        }}>
                            {section.title}
                        </h2>
                        <div style={{ 
                            lineHeight: '1.7', 
                            opacity: 0.8,
                            fontSize: '16px'
                        }}>
                            {section.body}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Fallback to raw HTML string with server-safe sanitization
    const rawHtml = typeof content === 'string' ? content : JSON.stringify(content);
    const sanitizedHtml = sanitizeRichText(rawHtml);

    return (
        <div
            className={`${styles.prose} ${className}`}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
