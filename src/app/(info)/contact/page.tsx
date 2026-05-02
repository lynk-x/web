import React from 'react';
import HomeLayout from "@/components/public/HomeLayout";
import ContactForm from "@/components/public/ContactForm/ContactForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | Lynk-X',
    description: 'Have a question or need assistance? Reach out to the Lynk-X team and we will get back to you as soon as possible.',
};

export default function ContactPage() {
    return (
        <HomeLayout hideCart={true} showBack={true}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '80px 20px',
                color: 'var(--color-utility-primaryText)',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    marginBottom: '16px',
                    fontFamily: 'var(--font-heading)'
                }}>Get in Touch</h1>
                <p style={{
                    fontSize: '18px',
                    opacity: 0.5,
                    lineHeight: 1.6,
                    maxWidth: '600px',
                    margin: '0 auto 64px'
                }}>
                    Whether you're an organizer needing support or an attendee with a question, our team is here to help you make the most of Lynk-X.
                </p>

                <div style={{ textAlign: 'left' }}>
                    <ContactForm />
                </div>
            </div>
        </HomeLayout>
    );
}
