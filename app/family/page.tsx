'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, UserPlus, Crown, Trash2, Clock, CheckCircle, 
  AlertCircle, Loader2, RefreshCw, ArrowLeft, X, Mail
} from 'lucide-react';

// Types for organization plugin (matching BetterAuth's types)
interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  expiresAt: Date;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export default function FamilyPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [creating, setCreating] = useState(false);

  const MAX_SEATS = 3; // Family plan includes owner + 2 members
  const usedSeats = members.length;
  const pendingInvites = invitations.filter(i => i.status === 'pending').length;

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login?redirect=/family');
    }
  }, [session, isPending, router]);

  const fetchOrganizationData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      setError(null);

      // List user's organizations to find their family org
      const { data: orgs, error: listError } = await authClient.organization.list();
      
      if (listError) {
        console.error('Error listing organizations:', listError);
        setOrganization(null);
        setMembers([]);
        setInvitations([]);
        setLoading(false);
        return;
      }

      // Find a family organization (by slug pattern or metadata)
      const familyOrg = orgs?.find((org) => 
        org.slug?.startsWith('family-') || 
        (org.metadata as Record<string, unknown>)?.type === 'family'
      );

      if (familyOrg) {
        setOrganization(familyOrg as Organization);
        
        // Set this as the active organization
        await authClient.organization.setActive({
          organizationId: familyOrg.id
        });

        // Get full organization details with members
        const { data: fullOrg, error: fullError } = await authClient.organization.getFullOrganization();

        if (fullError) {
          console.error('Error getting full organization:', fullError);
        } else if (fullOrg) {
          setMembers((fullOrg.members || []) as Member[]);
          setInvitations((fullOrg.invitations || []) as Invitation[]);
          
          // Check if current user is owner
          const currentMember = fullOrg.members?.find(
            (m) => m.userId === session.user.id
          );
          setIsOwner(currentMember?.role === 'owner');
        }
      } else {
        setOrganization(null);
        setMembers([]);
        setInvitations([]);
      }
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError('Failed to load family data');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchOrganizationData();
    }
  }, [session, fetchOrganizationData]);

  const handleCreateFamily = async () => {
    if (!session?.user) return;
    
    setCreating(true);
    setError(null);

    try {
      // Create a new family organization
      const slug = `family-${session.user.id.substring(0, 8)}`;
      const { data: newOrg, error: createError } = await authClient.organization.create({
        name: `${session.user.name || session.user.email}'s Family`,
        slug,
        metadata: { type: 'family', maxSeats: MAX_SEATS }
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create family');
      }

      setSuccess('Family created successfully!');
      if (newOrg) {
        setOrganization(newOrg as unknown as Organization);
      }
      fetchOrganizationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create family');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !organization) return;
    
    if (usedSeats + pendingInvites >= MAX_SEATS) {
      setError('Maximum seats reached. Remove a member or cancel an invitation first.');
      return;
    }
    
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: inviteError } = await authClient.organization.inviteMember({
        email: inviteEmail,
        role: 'member',
        organizationId: organization.id
      });
      
      if (inviteError) {
        throw new Error(inviteError.message || 'Failed to send invitation');
      }
      
      setSuccess(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setShowInviteModal(false);
      fetchOrganizationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberIdOrEmail: string) => {
    if (!organization) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const { error: removeError } = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId: organization.id
      });
      
      if (removeError) {
        throw new Error(removeError.message || 'Failed to remove member');
      }
      
      setSuccess('Member removed successfully');
      fetchOrganizationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const { error: cancelError } = await authClient.organization.cancelInvitation({
        invitationId
      });
      
      if (cancelError) {
        throw new Error(cancelError.message || 'Failed to cancel invitation');
      }
      
      setSuccess('Invitation canceled');
      fetchOrganizationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // No family organization yet - show create button
  if (!loading && !organization) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="text-center py-16">
            <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-pink-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Create Your Family</h1>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Start a Family plan to share Pro benefits with up to 2 additional members.
              All members get unlimited code executions, priority queue, and more.
            </p>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6 max-w-md mx-auto">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateFamily}
              disabled={creating}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-semibold transition flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Family
                </>
              )}
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Requires an active Family subscription
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="w-8 h-8 text-pink-400" />
                {organization?.name || 'Family Plan'}
              </h1>
              <p className="text-gray-400 mt-2">
                Manage your family members and share Pro benefits
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{usedSeats}/{MAX_SEATS}</div>
              <div className="text-sm text-gray-400">seats used</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Plan Owner Card */}
        <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-6 border border-pink-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-500/30 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <div className="font-semibold">{session?.user?.name || 'You'}</div>
                <div className="text-sm text-gray-400">{session?.user?.email}</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-pink-500/30 text-pink-300 rounded-full text-sm font-medium">
              {isOwner ? 'Plan Owner' : 'Member'}
            </span>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Members
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOrganizationData}
                className="p-2 text-gray-400 hover:text-white transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {isOwner && usedSeats + pendingInvites < MAX_SEATS && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium flex items-center gap-1 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : members.length <= 1 && invitations.filter(i => i.status === 'pending').length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No additional family members yet</p>
              <p className="text-sm text-gray-500">
                Invite up to {MAX_SEATS - 1} family members to share Pro benefits
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* Active Members (excluding owner shown above) */}
              {members.filter(m => m.userId !== session?.user?.id).map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                      {member.user.image ? (
                        <img src={member.user.image} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-lg font-medium">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{member.user.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-400">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      member.role === 'owner' 
                        ? 'bg-pink-500/20 text-pink-400'
                        : member.role === 'admin'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {member.role}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user.email)}
                        className="p-2 text-gray-400 hover:text-red-400 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Pending Invitations */}
              {invitations.filter(i => i.status === 'pending').map((invitation) => (
                <div key={invitation.id} className="p-4 flex items-center justify-between bg-yellow-500/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-yellow-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Invitation pending
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleCancelInvite(invitation.id)}
                      className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Benefits Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold mb-4">Family Benefits</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Unlimited code executions
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Priority execution queue
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              30-second timeout
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              90-day history
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Private competitions
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-400" />
              {MAX_SEATS} total seats
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">Invite Family Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="family@example.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder-gray-500"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                An invitation email will be sent to this address.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
