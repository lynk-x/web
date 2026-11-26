"use client";

import React, { useState } from 'react';
import styles from './FaqSection.module.css';

export interface FaqItem {
    question: string;
    answer: string;
}

interface FaqSectionProps {
    badge?: string;
    title?: string;
    subtitle?: string;
    items: FaqItem[];
}

/**
 * Renders an accessible FAQ accordion paired with matching `FAQPage` JSON-LD.
 * Answers stay mounted in SSR HTML and expand via CSS grid-row transitions so
 * structured data matches visible/DOM page content.
 */
export default function FaqSection({
    badge,
    title = 'Frequently Asked Questions',
    subtitle = 'Everything you need to know about getting started.',
    items,
}: FaqSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleItem = (index: number) => {
        setOpenIndex((prev) => (prev === index ? null : index));
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    return (
        <section className={styles.faqSection} aria-labelledby="faq-heading">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className={styles.header}>
                {badge && <div className={styles.badge}>{badge}</div>}
                <h2 id="faq-heading" className={styles.title}>
                    {title}
                </h2>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>

            <div className={styles.list}>
                {items.map((item, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <div
                            key={index}
                            className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
                        >
                            <button
                                type="button"
                                className={styles.questionButton}
                                onClick={() => toggleItem(index)}
                                aria-expanded={isOpen}
                                aria-controls={`faq-answer-${index}`}
                                id={`faq-question-${index}`}
                            >
                                <span className={styles.questionText}>{item.question}</span>
                                <svg
                                    className={styles.icon}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            <div
                                id={`faq-answer-${index}`}
                                role="region"
                                aria-labelledby={`faq-question-${index}`}
                                aria-hidden={!isOpen}
                                className={`${styles.answerWrapper} ${isOpen ? styles.answerWrapperOpen : ''}`}
                            >
                                <div className={styles.answerInner}>
                                    <div className={styles.answerContent}>
                                        {item.answer}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
