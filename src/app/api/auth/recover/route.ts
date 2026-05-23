import { NextResponse } from 'next/server';
import { processAccountRecovery } from '@/app/(auth)/recover/actions';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, recoveryCode, redirectTo } = body;

        if (!email || !recoveryCode) {
            return NextResponse.json(
                { error: 'Email and recovery code are required.' },
                { status: 400 }
            );
        }

        const result = await processAccountRecovery(email, recoveryCode, redirectTo);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ url: result.url }, { status: 200 });

    } catch (e: any) {
        console.error('API Error during recovery:', e);
        return NextResponse.json(
            { error: 'An unexpected server error occurred.' },
            { status: 500 }
        );
    }
}
