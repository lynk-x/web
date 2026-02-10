import React from 'react';
import Image from 'next/image';
import styles from './Navbar.module.css';

interface NavbarProps {
    /**
     * Callback function triggered when the menu icon is clicked.
     */
    onMenuClick: () => void;
}

/**
 * Navbar component that displays the application logo, navigation links, and user profile.
 * It includes a hamburger menu for mobile devices to toggle the AppDrawer.
 *
 * @param {NavbarProps} props - Component properties.
 */
const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.menuIcon} onClick={onMenuClick}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className={styles.logo}>
                    <Image
                        src="/images/lynk-x_text.png"
                        alt="Lynk-X"
                        width={200}
                        height={60}
                        className={styles.logoImage}
                        priority
                    />
                </div>
                <div className={styles.profile}>
                    <div className={styles.profileIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
