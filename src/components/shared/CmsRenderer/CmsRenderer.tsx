"use client";

import React from 'react';
import styles from './CmsRenderer.module.css';

interface CmsSection {
    title: string;
    body: string;
}

interface CmsContent {
    sections: CmsSection[];
}

interface CmsRendererProps {
    content: string | CmsContent | any;
    className?: string;
}

/**
 * Universal component to render CMS content.
 * Supports both raw HTML strings (from Tiptap) and structured JSON sections.
 */
export default function CmsRenderer({ content, className = '' }: CmsRendererProps) {
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

    // Fallback to raw HTML string
    return (
        <div
            className={`${styles.prose} ${className}`}
            dangerouslySetInnerHTML={{ __html: typeof content === 'string' ? content : JSON.stringify(content) }}
        />
    );
}
