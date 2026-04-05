import React from "react";
import AcceptInviteClient from "./AcceptInviteClient";

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

    return <AcceptInviteClient token={token} />;
}
