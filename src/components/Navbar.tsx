import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Navbar.module.css';
import { useCart } from "@/context/CartContext";

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
    const { itemCount } = useCart();
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
                    <Link href="/checkout" className={styles.profileIcon} aria-label="Shopping Cart">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 20C9 21.1046 8.10457 22 7 22C5.89543 22 5 21.1046 5 20C5 18.8954 5.89543 18 7 18C8.10457 18 9 18.8954 9 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 20C20 21.1046 19.1046 22 18 22C16.8954 22 16 21.1046 16 20C16 18.8954 16.8954 18 18 18C19.1046 18 20 18.8954 20 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M1 1H4L6.68 14.39C6.77144 14.8504 7.02191 15.264 7.38755 15.5583C7.75318 15.8526 8.2107 16.009 8.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
