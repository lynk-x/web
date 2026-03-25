import React from 'react';
import Tooltip from './Tooltip';
import styles from './Tooltip.module.css';

interface ExplainerIconProps {
    text: string;
    className?: string;
}

const ExplainerIcon: React.FC<ExplainerIconProps> = ({ text, className = '' }) => {
    return (
        <Tooltip text={text} className={`${styles.explainIcon} ${className}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        </Tooltip>
    );
};

export default ExplainerIcon;
