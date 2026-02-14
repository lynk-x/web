'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { login, signup } from './actions';

export default function AuthPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoginDetail, setIsLoginDetail] = useState(true); // Toggle between Login and "Create Account" view if needed, though design suggests one view

    return (
        <div className={styles.container}>
            <div className={styles.logoWrapper}>
                <Image
                    src="/images/lynk-x_text.png"
                    alt="Lynk-X"
                    width={200}
                    height={60}
                    style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                    priority
                />
            </div>

            <h1 className={styles.title}>{isLoginDetail ? 'Welcome Back' : 'Create Account'}</h1>
            <p className={styles.subtitle}>
                {isLoginDetail
                    ? 'Fill out the information below in order to access your account.'
                    : 'Let\'s get started by filling out the form below.'}
            </p>

            <form
                className={styles.form}
                action={async (formData) => {
                    if (!isLoginDetail) {
                        const password = formData.get('password') as string;
                        const confirmPassword = formData.get('confirmPassword') as string;

                        if (password !== confirmPassword) {
                            alert("Passwords do not match");
                            return;
                        }
                        await signup(formData);
                    } else {
                        await login(formData);
                    }
                }}
            >
                <div className={styles.inputWrapper}>
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.inputWrapper}>
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={isLoginDetail ? "Password" : "New Password"}
                        className={styles.input}
                        required
                        minLength={6}
                    />
                    <button
                        type="button"
                        className={styles.eyeIcon}
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20C7.03 20 3 15.5 3 10C3 8.19 3.8 6.55 5.06 5.06M9.9 4.24A9.12 9.12 0 0112 4C17 4 21 8.5 21 14C21 15.35 20.66 16.63 20.06 17.8L9.9 4.24zM1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                </div>

                {!isLoginDetail && (
                    <div className={styles.inputWrapper}>
                        <input
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            className={styles.input}
                            required
                        />
                        <button
                            type="button"
                            className={styles.eyeIcon}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20C7.03 20 3 15.5 3 10C3 8.19 3.8 6.55 5.06 5.06M9.9 4.24A9.12 9.12 0 0112 4C17 4 21 8.5 21 14C21 15.35 20.66 16.63 20.06 17.8L9.9 4.24zM1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}

                <div style={{ display: 'none' }}>
                    <input name="isSignup" value={!isLoginDetail ? 'true' : 'false'} readOnly />
                </div>

                <button type="submit" className={styles.signInBtn}>
                    {isLoginDetail ? 'Sign In' : 'Get Started'}
                </button>
            </form>

            <div className={styles.divider}>Or sign in with</div>

            <button className={styles.socialBtn}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.35 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.32H19.26C21.34 18.4 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
                    <path d="M12 23C14.97 23 17.46 22.014 19.26 20.35L15.71 17.6C14.73 18.26 13.48 18.66 12 18.66C9.13 18.66 6.71 16.72 5.84 14.11H2.18V16.95C3.98 20.53 7.7 23 12 23Z" fill="#34A853" />
                    <path d="M5.84 14.11C5.61 13.43 5.49 12.72 5.49 12C5.49 11.28 5.61 10.57 5.84 9.89V7.05H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.95L5.84 14.11Z" fill="#FBBC05" />
                    <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L18.65 4.57C16.95 2.99 14.68 2 12 2C7.7 2 3.98 4.47 2.18 8.05L5.84 10.89C6.71 8.28 9.13 6.34 12 5.38Z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

            <button className={styles.socialBtn}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.127 3.675-.552 9.12 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.99 3.96-.99 1.832 0 2.383.99 3.96.96 1.637-.033 2.626-1.423 3.622-2.879 1.139-1.636 1.606-3.22 1.619-3.32-.035-.013-3.13-1.203-3.163-4.757-.034-2.95 2.418-4.359 2.522-4.453-.137-.367-1.125-3.83-4.225-3.868-1.748.06-2.583 1.04-3.24 1.04-.64 0-1.228-1.04-2.45-1.04zM16.14 3.755c.806-1.002 1.34-2.396 1.196-3.793-1.157.062-2.553.805-3.376 1.77-.732.846-1.372 2.215-1.201 3.528 1.286.099 2.602-.65 3.38-1.505z" fill="white" />
                </svg>
                Continue with Apple
            </button>

            {isLoginDetail && (
                <div className={styles.forgotPassword}>
                    <Link href="/forgot-password" className={styles.forgotPasswordLink}>Forgot Password?</Link>
                </div>
            )}

            <div className={styles.footer}>
                <button
                    onClick={() => setIsLoginDetail(false)}
                    className={`${styles.footerLink} ${!isLoginDetail ? styles.activeLink : ''}`}
                >
                    Create Account
                </button>
                <button
                    onClick={() => setIsLoginDetail(true)}
                    className={`${styles.footerLink} ${isLoginDetail ? styles.activeLink : ''}`}
                >
                    Log In
                </button>
            </div>
        </div>
    );
}
