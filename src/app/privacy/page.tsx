"use client";

import React from 'react';
import Link from 'next/link';
import HomeLayout from "@/components/HomeLayout";

export default function PrivacyPage() {
    return (
        <HomeLayout>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px 20px',
                color: 'var(--color-utility-primaryText)',
                position: 'relative'
            }}>
                <Link href="/" style={{
                    position: 'absolute',
                    left: '20px',
                    top: '40px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-interface-surface)',
                    border: '1px solid var(--color-interface-outline)',
                    color: 'var(--color-utility-primaryText)',
                    transition: 'all 0.2s ease'
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <h1 style={{
                    fontSize: '32px',
                    fontFamily: 'var(--font-heading)',
                    marginBottom: '24px',
                    textAlign: 'center'
                }}>Privacy Policy</h1>

                <div style={{
                    background: 'var(--color-interface-surface)',
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-interface-outline)',
                    lineHeight: '1.6'
                }}>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>1. Introduction</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        Welcome to Lynk-X. We respect your privacy and are committed to protecting your personal data.
                        This privacy policy will inform you as to how we look after your personal data when you visit our website
                        and tell you about your privacy rights and how the law protects you.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>2. Data We Collect</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                    </p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px', opacity: 0.8 }}>
                        <li style={{ marginBottom: '8px' }}>Identity Data includes first name, last name, username or similar identifier.</li>
                        <li style={{ marginBottom: '8px' }}>Contact Data includes billing address, delivery address, email address and telephone numbers.</li>
                        <li style={{ marginBottom: '8px' }}>Transaction Data includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                    </ul>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>3. How We Use Your Data</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginBottom: '16px', opacity: 0.8 }}>
                        <li style={{ marginBottom: '8px' }}>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                        <li style={{ marginBottom: '8px' }}>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                    </ul>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>4. Contact Us</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at: support@lynk-x.app
                    </p>
                </div>
            </div>
        </HomeLayout>
    );
}
