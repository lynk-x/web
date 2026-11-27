import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Metadata } from "next";
import styles from "./page.module.css";
import { getErrorMessage } from '@/utils/error';

export const metadata: Metadata = {
    title: 'Accept Invitation',
    robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await searchParams;
    const token = resolvedParams.token as string | undefined;

    if (!token) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ fontWeight: 600, color: 'white' }}>Invalid or Missing Invitation Link</h1>
            </div>
        );
    }

    const router = useRouter();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [inviteDetails, setInviteDetails] = useState<any>(null);

    useEffect(() => {
        checkSessionAndInvite();
    }, [token]);

    const checkSessionAndInvite = async () => {
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("unauthenticated");
            setIsLoading(false);
            return;
        }

        try {
            const { data, error: fetchErr } = await supabase
                .schema('api')
                .from("v1_account_invitations")
                .select("id, account_id, invitee_email, role_slug, accepted_at, expires_at, account_display_name, account_slug, inviter_full_name, inviter_user_name")
                .eq("token", token)
                .single();

            if (fetchErr) {
                throw new Error("Invitation not found or has been revoked.");
            }

            if (data.accepted_at) {
                throw new Error("This invitation has already been accepted.");
            }

            const isExpired = new Date(data.expires_at) < new Date();
            if (isExpired) {
                throw new Error("This invitation has expired.");
            }

            if (user.email?.toLowerCase() !== data.invitee_email?.toLowerCase()) {
                throw new Error(`This invite was sent to ${data.invitee_email}, but you are logged in as ${user.email}.`);
            }

            const mappedData = {
                ...data,
                accounts: {
                    display_name: data.account_display_name,
                    slug: data.account_slug
                },
                inviter: {
                    full_name: data.inviter_full_name,
                    user_name: data.inviter_user_name
                }
            };

            setInviteDetails(mappedData);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || "Invalid invitation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        setError(null);
        try {
            const { error } = await supabase.schema('api').rpc("accept_account_invitation", {
                p_token: token,
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                router.push('/setup-profile');
            }, 2000);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || "Failed to accept invitation.");
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.title}>Loading Invitation...</div>
                </div>
            </div>
        );
    }

    if (error === "unauthenticated") {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.title}>You must be logged in</div>
                    <p className={styles.description}>
                        You need to be logged into Lynk-X to accept an organization invite.
                    </p>
                    <Link href={`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`} className={styles.acceptBtn} style={{ textDecoration: 'none' }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.title}>Join Organization</div>

                {error ? (
                    <div className={styles.errorBox}>{error}</div>
                ) : success ? (
                    <div className={styles.successBox}>
                        <strong>Success!</strong> Invitation accepted. Redirecting you to the dashboard...
                    </div>
                ) : inviteDetails ? (
                    <>
                        <p className={styles.description}>
                            <strong>{inviteDetails.inviter?.full_name || inviteDetails.inviter?.user_name || 'A team member'}</strong> has invited you to join the organization <strong>{inviteDetails.accounts?.display_name || 'Unknown'}</strong> as a <strong>{inviteDetails.role_slug.replace('_', ' ')}</strong>.
                        </p>

                        <button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className={styles.acceptBtn}
                        >
                            {isAccepting ? "Accepting..." : "Accept Invitation"}
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
