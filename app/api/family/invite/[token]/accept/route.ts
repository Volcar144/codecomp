import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// POST /api/family/invite/[token]/accept - Accept a family invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const { token } = resolvedParams;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // Verify user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
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

    // Check if user is already a family member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('owner_user_id', invitation.owner_user_id)
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this family plan' }, { status: 400 });
    }

    // Verify the owner still has an active family subscription
    const { data: subscription } = await supabase
      .from('subscription')
      .select('*')
      .eq('reference_id', invitation.owner_user_id)
      .eq('plan', 'family')
      .in('status', ['active', 'trialing'])
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'The family plan is no longer active' }, { status: 400 });
    }

    // Check seat count (family plan allows 3 total: owner + 2 members)
    const { count: memberCount } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', invitation.owner_user_id)
      .eq('status', 'active');

    if ((memberCount || 0) >= 2) {
      return NextResponse.json({ error: 'All family seats are filled' }, { status: 400 });
    }

    // Accept the invitation - create family member record
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        id: uuidv4(),
        owner_user_id: invitation.owner_user_id,
        member_user_id: userId,
        status: 'active',
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Error creating family member:', memberError);
      return NextResponse.json({ error: 'Failed to join family plan' }, { status: 500 });
    }

    // Update invitation status
    await supabase
      .from('family_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the family plan!',
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
