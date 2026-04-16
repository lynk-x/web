"use client";

import React, { useState, useEffect } from 'react';
import styles from './ContactForm.module.css';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function ContactForm() {
    const supabase = createClient();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    useEffect(() => {
        if (user && user.email) {
            setFormData(prev => ({ ...prev, email: user.email || '' }));
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        
        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user?.id,
                    full_name: formData.name,
                    email: formData.email,
                    subject: formData.subject,
                    message: formData.message
                });

            if (error) throw error;
            setStatus('sent');
        } catch (err) {
            console.error('Error sending support ticket:', err);
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className={styles.contactSection}>
                <div className={styles.successMessage}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <h3>Message Sent!</h3>
                    <p>We've received your inquiry and will get back to you shortly.</p>
                    <button className={styles.secondaryBtn} onClick={() => setStatus('idle')}>Send another message</button>
                </div>
            </div>
        );
    }

    return (
        <section className={styles.contactSection}>
            <h2 className={styles.contactTitle}>Write to us</h2>
            <p className={styles.contactDesc}>If you couldn't find what you were looking for, our support team is available 24/7 to help you out.</p>
            
            <form className={styles.contactForm} onSubmit={handleSubmit}>
                {status === 'error' && (
                    <p style={{ color: 'var(--color-interface-error)', marginBottom: '16px' }}>
                        Something went wrong. Please try again later.
                    </p>
                )}
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleInputChange} 
                            placeholder="Your name" 
                            required 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleInputChange} 
                            placeholder="Your email address" 
                            required 
                        />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="subject">Subject</label>
                    <input 
                        type="text" 
                        id="subject" 
                        name="subject" 
                        value={formData.subject} 
                        onChange={handleInputChange} 
                        placeholder="What is this regarding?" 
                        required 
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="message">Message</label>
                    <textarea 
                        id="message" 
                        name="message" 
                        value={formData.message} 
                        onChange={handleInputChange} 
                        placeholder="How can we help?" 
                        rows={6} 
                        required 
                    />
                </div>
                <button type="submit" className={styles.primaryBtn} disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
            </form>
        </section>
    );
}
