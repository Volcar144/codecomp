import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/family/invite/[token] - Get invitation info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const { token } = resolvedParams;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // Find the invitation
    const { data: invitation, error } = await supabase
      .from('family_invitations')
      .select('*, owner:owner_user_id(name, email)')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 410 });
    }

    // Check if canceled
    if (invitation.status === 'canceled') {
      return NextResponse.json({ error: 'Invitation has been canceled' }, { status: 410 });
    }

    const owner = invitation.owner as { name?: string; email?: string } | null;

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      inviterName: owner?.name || owner?.email || 'A CodeComp user',
      planName: 'Family',
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
