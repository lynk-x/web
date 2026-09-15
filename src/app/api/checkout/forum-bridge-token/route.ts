import { NextResponse } from 'next/server';
import { mintForumBridgeToken } from '@/app/(public)/checkout/confirmation/actions';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, eventId } = body;

        if (!userId || !eventId) {
            return NextResponse.json(
                { error: 'userId and eventId are required.' },
                { status: 400 }
            );
        }

        const result = await mintForumBridgeToken(userId, eventId);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ tokenHash: result.tokenHash }, { status: 200 });

    } catch (e: any) {
        console.error('API Error minting forum bridge token:', e);
        return NextResponse.json(
            { error: 'An unexpected server error occurred.' },
            { status: 500 }
        );
    }
}
