"use client";

import { motion } from 'framer-motion';
import React from 'react';

interface SlotCounterTextProps {
    text: string;
    className?: string;
    delay?: number;
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$!#";

/**
 * Renders a deterministic slot-machine roll animation for display headlines.
 * Exposes a clean visually-hidden text node for crawlers and screen readers
 * while hiding the animated character reels with `aria-hidden`.
 */
export const SlotCounterText = ({ text, className, delay = 0 }: SlotCounterTextProps) => {
    const words = text.split(' ');

    return (
        <span className={className} style={{ position: 'relative', display: 'inline', verticalAlign: 'bottom' }}>
            <span
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                }}
            >
                {text}
            </span>
            <span aria-hidden="true">
                {words.map((word, wordIdx) => (
                    <span
                        key={wordIdx}
                        style={{
                            display: 'inline-flex',
                            overflow: 'hidden',
                            height: '1.1em',
                            verticalAlign: 'bottom',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {word.split('').map((char, i) => {
                            // Deterministic character reel avoids SSR/client hydration mismatches.
                            const reelLength = 8;
                            const reel = Array.from({ length: reelLength }).map((_, step) => {
                                const index =
                                    (wordIdx * 31 + i * 17 + step * 7 + char.charCodeAt(0)) %
                                    characters.length;
                                return characters[index];
                            });
                            reel.push(char);

                            return (
                                <span
                                    key={i}
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        height: '1.1em',
                                        width: 'auto',
                                    }}
                                >
                                    <motion.span
                                        initial={{ y: 0 }}
                                        animate={{ y: `-${(reel.length - 1) * 1.1}em` }}
                                        transition={{
                                            duration: 1.2 + i * 0.05,
                                            delay: delay + wordIdx * 0.2 + i * 0.02,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                        }}
                                    >
                                        {reel.map((r, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    height: '1.1em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background:
                                                        'linear-gradient(to bottom, #ffffff 10%, rgba(255, 255, 255, 0.6) 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    backgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}
                                            >
                                                {r}
                                            </span>
                                        ))}
                                    </motion.span>
                                    <span style={{ opacity: 0 }}>{char}</span>
                                </span>
                            );
                        })}
                        {wordIdx < words.length - 1 && <span style={{ width: '0.25em' }}>&nbsp;</span>}
                    </span>
                ))}
            </span>
        </span>
    );
};
