"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import styles from './setup.module.css';

export default function ProfileSetupPage() {
    const router = useRouter();
    const { user, profile, isLoading: isLoadingAuth, isLoadingProfile } = useAuth();
    const { setActiveAccountId } = useOrganization();
    const supabase = createClient();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [userName, setUserName] = useState(profile?.user_name || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
    const [accountType, setAccountType] = useState('organize');
    const [accountRef, setAccountRef] = useState<string | null>(null);
    const [nextUrl, setNextUrl] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setAccountType(params.get('type') || 'organize');
            setAccountRef(params.get('accountRef') || params.get('accountId'));
            setNextUrl(params.get('next'));
        }
    }, []);

    // Auto-redirect if profile is already complete
    useEffect(() => {
        if (!isLoadingAuth && !isLoadingProfile && !hasCheckedInitial) {
            if (profile && profile.full_name && profile.full_name.trim() !== '') {
                if (accountRef) {
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountRef)) {
                        localStorage.setItem('lynks_active_account_id', accountRef);
                    }
                    setActiveAccountId(accountRef);
                }
                
                if (nextUrl) {
                    router.replace(nextUrl);
                } else if (accountRef) {
                    router.replace(`/dashboard/${accountType}`);
                } else {
                    router.replace('/dashboard');
                }
            }
            setHasCheckedInitial(true);
        }
    }, [profile, isLoadingAuth, isLoadingProfile, hasCheckedInitial, router, accountType, accountRef, nextUrl, setActiveAccountId]);

    // Debounced username check
    useEffect(() => {
        const handler = setTimeout(async () => {
            const trimmedName = userName.trim();
            if (trimmedName.length >= 3 && trimmedName !== profile?.user_name) {
                setIsCheckingUsername(true);
                try {
                    const { data, error: rpcError } = await supabase.rpc('is_username_available', {
                        username_to_check: trimmedName
                    });
                    if (rpcError) throw rpcError;
                    setIsUsernameAvailable(data);
                } catch {
                    setIsUsernameAvailable(null);
                } finally {
                    setIsCheckingUsername(false);
                }
            } else {
                setIsUsernameAvailable(null);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [userName, profile?.user_name, supabase]);


    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar.${fileExt}`;
            // Path: /{user_id}/{filename} — required by the avatars bucket RLS policy
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (err: unknown) {
            setError('Failed to upload image. Please try again.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !userName.trim() || !user) {
            setError('Please fill in all fields.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('user_profile')
                .update({
                    full_name: fullName.trim(),
                    user_name: userName.trim(),
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (updateError) throw updateError;
            
            if (accountRef) {
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountRef)) {
                    localStorage.setItem('lynks_active_account_id', accountRef);
                }
                setActiveAccountId(accountRef);
            }

            // Success: Direct them to the workspace overview or next url
            if (nextUrl) {
                router.push(nextUrl);
            } else if (accountRef) {
                router.push(`/dashboard/${accountType}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to update profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isAds = accountType === 'ads';
    const displayRole = isAds ? 'Advertiser' : 'Organizer';

    return (
        <div className={styles.container}>
            <div className={styles.setupCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Create Your {displayRole} Identity</h1>
                    <p className={styles.subtitle}>Tell us a bit about yourself. This profile is your public persona as {isAds ? 'an advertiser' : 'an organizer'} on the platform.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorBox}>{error}</div>}

                    {/* Profile Picture */}
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarPreview} onClick={handleUploadClick}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" />
                            ) : (
                                <div className={styles.placeholderIcon}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                            )}
                            <div className={styles.uploadOverlay}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                        />
                        <p className={styles.helperText}>Recommended: Square 400x400px</p>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={styles.input}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.labelRow}>
                            <label className={styles.label}>Username</label>
                            {isCheckingUsername && <span className={styles.checking}>Checking...</span>}
                            {!isCheckingUsername && isUsernameAvailable === true && <span className={styles.available}>Available</span>}
                            {!isCheckingUsername && isUsernameAvailable === false && <span className={styles.taken}>Unavailable</span>}
                        </div>
                        <input 
                            type="text" 
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className={`${styles.input} ${isUsernameAvailable === false ? styles.inputError : ''}`}
                            placeholder="johndoe_organize"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={styles.submitBtn}
                        disabled={isSubmitting || isCheckingUsername || isUsernameAvailable === false}
                    >
                        {isSubmitting ? 'Saving...' : 'Finish Profile Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
}
