'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, UserPlus, Crown, Mail, Trash2, Clock, CheckCircle, 
  AlertCircle, Loader2, Copy, RefreshCw, ArrowLeft, X
} from 'lucide-react';

interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'pending' | 'expired';
  joinedAt: string | null;
  invitedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export default function FamilyPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const MAX_SEATS = 3; // Family plan includes owner + 2 members
  const usedSeats = members.filter(m => m.status === 'active').length + 1; // +1 for owner
  const pendingInvites = invitations.filter(i => i.status === 'pending').length;

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login?redirect=/family');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchFamilyData();
    }
  }, [session]);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/family/members');
      if (!res.ok) throw new Error('Failed to fetch family data');
      const data = await res.json();
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch {
      // If API doesn't exist yet, show empty state
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      setSuccess(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteLink(data.inviteLink || null);
      setShowInviteModal(false);
      fetchFamilyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const res = await fetch(`/api/family/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to remove member');
      
      setSuccess('Member removed successfully');
      fetchFamilyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/family/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to cancel invitation');
      
      setSuccess('Invitation canceled');
      fetchFamilyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setSuccess('Invite link copied to clipboard!');
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
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
                Family Plan
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

        {/* Invite Link Banner */}
        {inviteLink && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-300 mb-2">Share this link with your family member:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 px-3 py-2 rounded text-sm text-white truncate">
                {inviteLink}
              </code>
              <button
                onClick={copyInviteLink}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
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
              Plan Owner
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
            <button
              onClick={fetchFamilyData}
              className="p-2 text-gray-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : members.length === 0 && invitations.filter(i => i.status === 'pending').length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No family members yet</p>
              <p className="text-sm text-gray-500">
                Invite up to {MAX_SEATS - 1} family members to share Pro benefits
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* Active Members */}
              {members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium">
                        {(member.name || member.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{member.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-400">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      member.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {member.status}
                    </span>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending Invitations */}
              {invitations.filter(i => i.status === 'pending').map((invite) => (
                <div key={invite.id} className="p-4 flex items-center justify-between bg-gray-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Invitation sent • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                      pending
                    </span>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition"
                      title="Cancel invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Button */}
        {usedSeats + pendingInvites < MAX_SEATS && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full py-4 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Invite Family Member
            <span className="text-pink-200 text-sm">
              ({MAX_SEATS - usedSeats - pendingInvites} seats available)
            </span>
          </button>
        )}

        {usedSeats + pendingInvites >= MAX_SEATS && (
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <p className="text-gray-400">
              All seats are filled. Remove a member to invite someone new.
            </p>
          </div>
        )}

        {/* How it Works */}
        <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="font-semibold mb-4">How Family Plan Works</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-pink-400">1</span>
              </div>
              <p>Invite up to 2 family members or friends by email</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-pink-400">2</span>
              </div>
              <p>They&apos;ll receive an email with a link to join your plan</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-pink-400">3</span>
              </div>
              <p>Each member gets their own account with all Pro benefits</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-pink-400">4</span>
              </div>
              <p>You manage members and billing from this page</p>
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-pink-400" />
                  Invite Family Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleInvite}>
                <label className="block text-sm text-gray-400 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-pink-500 mb-4"
                  required
                />
                
                <p className="text-sm text-gray-400 mb-4">
                  We&apos;ll send them an invitation email. The link expires in 7 days.
                </p>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
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
    </div>
  );
}
