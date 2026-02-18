import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The width of the skeleton element. Defaults to '100%'. */
    width?: string;
    /** The height of the skeleton element. Defaults to '20px'. */
    height?: string;
    /** The border radius of the skeleton element. Defaults to '4px'. */
    borderRadius?: string;
}

/**
 * Skeleton component used to create loading placeholders.
 * It displays a shimmering animation to indicate that content is loading.
 *
 * @param {SkeletonProps} props - Component properties including width, height, and borderRadius.
 */
const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '20px',
    borderRadius = '4px',
    className = '',
    style,
    ...props
}) => {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{
                width,
                height,
                borderRadius,
                ...style
            }}
            {...props}
        ></div>
    );
};

export default Skeleton;
