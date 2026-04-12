"use client";

import { motion } from 'framer-motion';
import React from 'react';

/**
 * SlotCounterText
 * Creates a "Slot Machine" rolling effect for each character in a string.
 * High-performance animation using Framer Motion.
 */

interface SlotCounterTextProps {
    text: string;
    className?: string;
    delay?: number;
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$!#";

export const SlotCounterText = ({ text, className, delay = 0 }: SlotCounterTextProps) => {
    const words = text.split(' ');

    return (
        <span className={className} style={{ display: 'inline', verticalAlign: 'bottom' }}>
            {words.map((word, wordIdx) => (
                <span 
                    key={wordIdx} 
                    style={{ 
                        display: 'inline-flex', 
                        overflow: 'hidden', 
                        height: '1.1em', 
                        verticalAlign: 'bottom',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {word.split('').map((char, i) => {
                        // Create a reel of random characters ending with the target character
                        const reelLength = 8;
                        const reel = Array.from({ length: reelLength }).map(() => 
                            characters[Math.floor(Math.random() * characters.length)]
                        );
                        reel.push(char);

                        return (
                            <span 
                                key={i} 
                                style={{ 
                                    position: 'relative', 
                                    display: 'inline-block', 
                                    height: '1.1em', 
                                    width: 'auto'
                                }}
                            >
                                <motion.span
                                    initial={{ y: 0 }}
                                    animate={{ y: `-${(reel.length - 1) * 1.1}em` }}
                                    transition={{
                                        duration: 1.2 + (i * 0.05),
                                        delay: delay + (wordIdx * 0.2) + (i * 0.02),
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        background: 'linear-gradient(to bottom, #fff 20%, rgba(255, 255, 255, 0.5) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}
                                >
                                    {reel.map((r, idx) => (
                                        <span 
                                            key={idx} 
                                            style={{ 
                                                height: '1.1em', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center' 
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
                    {/* Add space after word if not the last one */}
                    {wordIdx < words.length - 1 && <span style={{ width: '0.25em' }}>&nbsp;</span>}
                </span>
            ))}
        </span>
    );
};
