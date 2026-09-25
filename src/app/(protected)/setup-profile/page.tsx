"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { convertImageToWebP } from '@/utils/imageConversion';
import styles from './setup.module.css';

// Draft fields persisted across refresh/navigation, same pattern as
// /onboarding's OnboardingDraft — a refresh mid-form previously lost
// whatever the user had typed, since state was only ever seeded from the
// (usually still-empty) profile fetched on mount.
const DRAFT_KEY = 'lynkx_setup_profile_draft';

interface ProfileDraft {
    fullName: string;
    userName: string;
    avatarUrl: string | null;
}

function loadDraft(): Partial<ProfileDraft> | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveDraft(draft: ProfileDraft) {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
        // Best-effort only — quota/private-mode failures shouldn't block setup.
    }
}

function clearDraft() {
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {
        // no-op
    }
}

export default function ProfileSetupPage() {
    const router = useRouter();
    const { user, profile, isLoading: isLoadingAuth, isLoadingProfile } = useAuth();

    const supabase = createClient();

    const draft = typeof window !== 'undefined' ? loadDraft() : null;

    const [fullName, setFullName] = useState(draft?.fullName ?? profile?.full_name ?? '');
    const [userName, setUserName] = useState(draft?.userName ?? profile?.user_name ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(draft?.avatarUrl ?? profile?.avatar_url ?? null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
    const [isRegeneratingUsername, setIsRegeneratingUsername] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
    const isPremium = profile?.is_premium === true;
    useEffect(() => {
        if (!draft?.userName && profile?.user_name) {
            setUserName(profile.user_name);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.user_name]);

    // Persist the resumable subset of form state on every change.
    useEffect(() => {
        saveDraft({ fullName, userName, avatarUrl });
    }, [fullName, userName, avatarUrl]);

    // Auto-redirect if profile is already complete
    useEffect(() => {
        if (!isLoadingAuth && !isLoadingProfile && !hasCheckedInitial) {
            if (profile && profile.full_name && profile.full_name.trim() !== '') {
                router.replace('/dashboard');
            }
            setHasCheckedInitial(true);
        }
    }, [profile, isLoadingAuth, isLoadingProfile, hasCheckedInitial, router]);

    // Pre-populate a username for users who don't have one yet — required
    // by the middleware's `user_has_complete_profile` gate.
    useEffect(() => {
        if (!user && !profile) return;
        const existing = userName.trim();
        if (existing.length > 0) return;

        let cancelled = false;
        (async () => {
            try {
                const { data, error: rpcError } = await supabase.schema('api').rpc('regenerate_username');
                if (rpcError) throw rpcError;
                if (!cancelled && data) {
                    setUserName((data as { user_name: string }).user_name);
                }
            } catch {
                // Non-fatal — user can still type or regenerate manually.
            }
        })();

        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced username check — only for premium accounts, since only they
    // can edit the field manually. Non-premium users rely on the auto-generated
    // value and the regenerate button instead.
    useEffect(() => {
        if (!isPremium) {
            setIsUsernameAvailable(null);
            return;
        }
        const handler = setTimeout(async () => {
            const trimmedName = userName.trim();
            if (trimmedName.length >= 3 && trimmedName !== profile?.user_name) {
                setIsCheckingUsername(true);
                try {
                    const { data, error: rpcError } = await supabase.schema('api').rpc('is_username_available', {
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
    }, [userName, profile?.user_name, supabase, isPremium]);

    const handleRegenerateUsername = async () => {
        setIsRegeneratingUsername(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.schema('api').rpc('regenerate_username');
            if (rpcError) throw rpcError;
            setUserName((data as { user_name: string }).user_name);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to generate a new username.');
        } finally {
            setIsRegeneratingUsername(false);
        }
    };


    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile || !user) return;

        try {
            const file = await convertImageToWebP(rawFile);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_avatar.${fileExt}`;

            const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                body: {
                    action: 'upload',
                    folder: 'avatars',
                    filename: fileName,
                    contentType: file.type,
                    mediaType: 'image',
                }
            });

            if (signError || !signData?.uploadUrl) {
                throw new Error(signError?.message || 'Failed to get upload URL');
            }

            const putResponse = await fetch(signData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!putResponse.ok) {
                throw new Error('Failed to upload avatar to R2');
            }

            setAvatarUrl(signData.fileUrl);
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
            // internal.handle_new_user() only auto-creates a user_profile row
            // for account_type='attendee' signups — an organizer/advertiser
            // signup (password, OTP, or Google OAuth) never gets one this
            // way, and api.v1_profiles has no INSTEAD OF INSERT rule, so the
            // update below would silently affect zero rows without this.
            const { error: ensureError } = await supabase.schema('api').rpc('ensure_own_profile');
            if (ensureError) throw ensureError;

            const { error: updateError } = await supabase
                .schema('api')
                .from('v1_profiles')
                .update({
                    full_name: fullName.trim(),
                    ...(isPremium ? { user_name: userName.trim() } : {}),
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            clearDraft();
            // Success: Direct them to the dashboard
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to update profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render nothing until the "already complete" check above resolves,
    // rather than flashing the (empty, since profile hasn't loaded yet)
    // form before redirecting an already-set-up user away to /dashboard.
    if (!hasCheckedInitial) {
        return <div className={styles.container} />;
    }

    return (
        <div className={styles.container}>
            <div className={styles.setupCard}>
                <div className={styles.header}>
                    <p className={styles.stepLabel}>Step 1 of 2 &middot; Profile</p>
                    <div className={styles.stepIndicator}>
                        <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
                        <div className={styles.stepDot} />
                    </div>
                    <h1 className={styles.title}>Complete Your Personal Profile</h1>
                    <p className={styles.subtitle}>Tell us a bit about yourself. This profile is your global identity across Lynk-X.</p>
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
                            {isPremium && isCheckingUsername && <span className={styles.checking}>Checking...</span>}
                            {isPremium && !isCheckingUsername && isUsernameAvailable === true && <span className={styles.available}>Available</span>}
                            {isPremium && !isCheckingUsername && isUsernameAvailable === false && <span className={styles.taken}>Unavailable</span>}
                        </div>
                        <div className={styles.usernameRow}>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                disabled={!isPremium}
                                className={`${styles.input} ${isPremium && isUsernameAvailable === false ? styles.inputError : ''}`}
                                placeholder="johndoe_organize"
                                required
                            />
                            <button
                                type="button"
                                className={`${styles.regenerateBtn} ${isRegeneratingUsername ? styles.spinning : ''}`}
                                onClick={handleRegenerateUsername}
                                disabled={isRegeneratingUsername || isSubmitting}
                                aria-label="Generate a new username"
                                title="Generate a new username"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isSubmitting || (isPremium && (isCheckingUsername || isUsernameAvailable === false))}
                    >
                        {isSubmitting ? 'Saving...' : 'Finish Profile Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
}
