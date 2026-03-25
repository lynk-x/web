import React, { ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
    text: string | ReactNode;
    children: ReactNode;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className = '' }) => {
    return (
        <div className={`${styles.tooltipContainer} ${className}`}>
            {children}
            <div className={styles.tooltipBubble} role="tooltip">
                {text}
            </div>
        </div>
    );
};

export default Tooltip;
