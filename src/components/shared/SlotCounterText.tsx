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
    return (
        <span className={className} style={{ display: 'inline-flex', overflow: 'hidden', height: '1.1em', verticalAlign: 'bottom' }}>
            {text.split('').map((char, i) => {
                // Preserve spaces
                if (char === ' ') {
                    return <span key={i} style={{ width: '0.3em' }}>&nbsp;</span>;
                }

                // Create a reel of random characters ending with the target character
                // We use 8 random frames for the "roll" effect
                const reelLength = 8;
                const reel = Array.from({ length: reelLength }).map(() => 
                    characters[Math.floor(Math.random() * characters.length)]
                );
                reel.push(char); // Target is the final stop

                return (
                    <span 
                        key={i} 
                        style={{ 
                            position: 'relative', 
                            display: 'inline-block', 
                            height: '1.1em', 
                            width: 'auto',
                            minWidth: '0.65em',
                            textAlign: 'center'
                        }}
                    >
                        <motion.span
                            initial={{ y: 0 }}
                            animate={{ y: `-${(reel.length - 1) * 1.1}em` }}
                            transition={{
                                duration: 1.2 + (i * 0.05), // Staggered duration for a more organic feel
                                delay: delay + (i * 0.02),
                                ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for snappy "stop"
                            }}
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'absolute',
                                left: 0,
                                right: 0
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
                        {/* Invisible character to maintain width */}
                        <span style={{ opacity: 0 }}>{char}</span>
                    </span>
                );
            })}
        </span>
    );
};
