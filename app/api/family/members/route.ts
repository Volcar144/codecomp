import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import { sendFamilyInviteEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// GET /api/family/members - Get family members and invitations
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has a family subscription
    const { data: subscription } = await supabase
      .from('subscription')
      .select('*')
      .eq('reference_id', userId)
      .eq('plan', 'family')
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({ 
        error: 'No active family subscription', 
        members: [],
        invitations: [] 
      }, { status: 403 });
    }

    // Get family members
    const { data: members } = await supabase
      .from('family_members')
      .select(`
        id,
        member_user_id,
        status,
        joined_at,
        invited_at,
        user:member_user_id (
          email,
          name
        )
      `)
      .eq('owner_user_id', userId);

    // Get pending invitations
    const { data: invitations } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      members: (members || []).map(m => ({
        id: m.id,
        email: (m.user as { email?: string })?.email || '',
        name: (m.user as { name?: string })?.name || null,
        status: m.status,
        joinedAt: m.joined_at,
        invitedAt: m.invited_at,
      })),
      invitations: (invitations || []).map(i => ({
        id: i.id,
        email: i.email,
        status: i.status,
        createdAt: i.created_at,
        expiresAt: i.expires_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/family/members - Invite a family member
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

    // Check if email is already invited or a member
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
