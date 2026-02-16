import React from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    onFocus?: () => void;
    onBlur?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onFocus, onBlur }) => {
    return (
        <div className={styles.searchContainer}>
            <input
                type="text"
                placeholder="Search for an event"
                className={styles.input}
                onFocus={onFocus}
                onBlur={onBlur}
            />
            <div className={styles.icon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
};

export default SearchBar;
