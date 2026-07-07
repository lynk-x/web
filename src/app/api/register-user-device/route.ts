import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RegisterDevicePayload {
  token: string;
  deviceInfo?: Record<string, unknown>;
}

interface RemoveDevicePayload {
  token: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as RegisterDevicePayload;
  const { token, deviceInfo } = body;

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { error } = await supabase.schema('api').rpc('register_user_device', {
    p_fcm_token: token,
    p_info: deviceInfo ?? {},
  });

  if (error) {
    console.error('[API] register_user_device failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as RemoveDevicePayload;
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { error } = await supabase
    .schema('api')
    .rpc('remove_user_device', { p_fcm_token: token });

  if (error) {
    console.error('[API] remove_user_device failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
