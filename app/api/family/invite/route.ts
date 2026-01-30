import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import { sendFamilyInviteEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// POST /api/family/invite - Invite a family member (alias for POST /api/family/members)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Can't invite yourself
    if (email === session.user.email) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    // Check if user has a family subscription
    const { data: subscription } = await supabase
      .from('subscription')
      .select('*')
      .eq('reference_id', userId)
      .eq('plan', 'family')
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'No active family subscription' }, { status: 403 });
    }

    // Check current member count (owner + 2 members = 3 total)
    const { count: memberCount } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('status', 'active');

    const { count: pendingCount } = await supabase
      .from('family_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('status', 'pending');

    const totalUsed = (memberCount || 0) + (pendingCount || 0) + 1; // +1 for owner
    if (totalUsed >= 3) {
      return NextResponse.json({ error: 'All family seats are filled' }, { status: 400 });
    }

    // Check if email is already invited
    const { data: existingInvite } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('*, user:member_user_id(email)')
      .eq('owner_user_id', userId)
      .eq('status', 'active');

    const isAlreadyMember = existingMember?.some(m => (m.user as { email?: string })?.email === email);
    if (isAlreadyMember) {
      return NextResponse.json({ error: 'This person is already a family member' }, { status: 400 });
    }

    // Create invitation
    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invitation, error: insertError } = await supabase
      .from('family_invitations')
      .insert({
        id: uuidv4(),
        owner_user_id: userId,
        email,
        token: inviteToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/family/${inviteToken}`;
    
    await sendFamilyInviteEmail(email, {
      inviterName: session.user.name || session.user.email || 'A CodeComp user',
      planName: 'Family',
      inviteUrl,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
      },
      inviteLink: inviteUrl,
    });
  } catch (error) {
    console.error('Error inviting family member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
