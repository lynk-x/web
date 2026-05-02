"use client";

import React, { useState, useEffect } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';

interface ProductTourProps {
    storageKey: string;
    steps: Step[];
    runOnMount?: boolean;
}

const ProductTour: React.FC<ProductTourProps> = ({ storageKey, steps, runOnMount = true }) => {
    const [run, setRun] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!runOnMount) return;

        // Check if user has already seen this tour
        const hasSeen = localStorage.getItem(storageKey);
        
        if (!hasSeen) {
            // Wait for the DOM to fully paint before starting the tour
            let raf1: number, raf2: number;
            raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setRun(true));
            });
            return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
        }
    }, [storageKey, runOnMount]);

    const handleJoyrideCallback = (data: EventData) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        
        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem(storageKey, 'true');
        }
    };

    if (!mounted) return null;

    return (
        <Joyride
            onEvent={handleJoyrideCallback}
            continuous
            run={run}
            scrollToFirstStep
            steps={steps}
            options={{
                zIndex: 10000,
                primaryColor: 'var(--color-brand-primary, #20f928)',
                textColor: 'var(--color-utility-primaryText, #ffffff)',
                backgroundColor: 'var(--color-interface-surface, #1e1e1e)',
                arrowColor: 'var(--color-interface-surface, #1e1e1e)',
                overlayColor: 'rgba(0, 0, 0, 0.7)',
                showProgress: true,
                buttons: ['back', 'primary', 'skip'],
            }}
            styles={{
                buttonPrimary: {
                    backgroundColor: 'var(--color-brand-primary, #20f928)',
                    color: '#000000',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                },
                buttonBack: {
                    color: 'var(--color-utility-primaryText, #ffffff)',
                },
                buttonSkip: {
                    color: '#aaaaaa',
                },
                tooltip: {
                    borderRadius: '12px',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)',
                    padding: '20px',
                },
                tooltipContent: {
                    padding: '10px 0',
                    textAlign: 'left',
                },
                tooltipTitle: {
                    fontWeight: 700,
                    fontSize: '18px',
                    textAlign: 'left',
                }
            }}
        />
    );
};

export default ProductTour;
