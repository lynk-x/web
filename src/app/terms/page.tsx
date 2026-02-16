"use client";

import React from 'react';
import Link from 'next/link';
import HomeLayout from "@/components/HomeLayout";

export default function TermsPage() {
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
                }}>Terms & Conditions</h1>

                <div style={{
                    background: 'var(--color-interface-surface)',
                    padding: '32px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-interface-outline)',
                    lineHeight: '1.6'
                }}>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>1. Agreement to Terms</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        By accessing or using Lynk-X, you agree to be bound by these Terms. If you disagree with any part of the terms,
                        then you may not access the service.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>2. Accounts</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        When you create an account with us, you must provide us information that is accurate, complete, and current at all times.
                        Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>3. Ticket Sales and Purchases</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        Lynk-X acts as an intermediary between event organizers and attendees. We are not responsible for the cancellation or
                        postponement of events. Refund policies are set by individual event organizers.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>4. Content</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos,
                        or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality,
                        reliability, and appropriateness.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>5. Termination</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever,
                        including without limitation if you breach the Terms.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '12px' }}>6. Contact Us</h2>
                    <p style={{ marginBottom: '16px', opacity: 0.8 }}>
                        If you have any questions about these Terms, please contact us at: legal@lynk-x.app
                    </p>
                </div>
            </div>
        </HomeLayout>
    );
}
