import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { encryptToken } from '@/utils/crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Encrypt the token on the server
    const encryptedToken = encryptToken(token);

    // Save or update in database
    const { error } = await supabase
      .from('user_settings')
      .upsert({ 
        user_id: user.id, 
        github_token: encryptedToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving token:', error);
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Token encrypted and saved successfully.' });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('github_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return a boolean so the frontend knows if a token is set, WITHOUT sending the token itself.
    const hasToken = !!(data && data.github_token);

    return NextResponse.json({ hasToken });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
