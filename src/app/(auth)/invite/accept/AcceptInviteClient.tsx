"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "./page.module.css";
import Link from "next/link";

export default function AcceptInviteClient({ token }: { token: string }) {
    const router = useRouter();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [inviteDetails, setInviteDetails] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        checkSessionAndInvite();
    }, [token]);

    const checkSessionAndInvite = async () => {
        setIsLoading(true);

        // getUser() re-validates with the auth server so the email we compare against
        // the invite's invitee_email comes from a trusted source, not a cached JWT.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("unauthenticated");
            setIsLoading(false);
            return;
        }

        setUserEmail(user.email || null);

        try {
            // Just check if the token exists to show who invited them. We do this securely by not exposing raw data.
            // actually, just let them accept it straight via RPC or we can get basic info if we join
            const { data, error: fetchErr } = await supabase
                .from("account_invitations")
                .select("id, invitee_email, role_slug, accepted_at, expires_at, accounts:account_id(display_name), inviter:invited_by(full_name, user_name)")
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

            // Check if emails match (optional security step, but good DX)
            if (user.email?.toLowerCase() !== data.invitee_email?.toLowerCase()) {
                throw new Error(`This invite was sent to ${data.invitee_email}, but you are logged in as ${user.email}.`);
            }

            setInviteDetails(data);
        } catch (err: any) {
            setError(err.message || "Invalid invitation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc("accept_account_invitation", {
                p_token: token,
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                router.push("/dashboard/organize");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to accept invitation.");
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
