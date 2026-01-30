'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, UserPlus, Crown, Mail, Trash2, Clock, CheckCircle, 
  AlertCircle, Loader2, Copy, RefreshCw, ArrowLeft, X, Plus,
  Users, Settings, BarChart3, Shield
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'expired';
  joinedAt: string | null;
  invitedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: {
    includedSeats: number;
    additionalSeats: number;
    pricePerSeat: number;
  };
}

export default function TeamPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddSeatsModal, setShowAddSeatsModal] = useState(false);
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'billing'>('members');

  const BASE_SEATS = 5;
  const PRICE_PER_SEAT = 5;
  const totalSeats = team ? team.plan.includedSeats + team.plan.additionalSeats : BASE_SEATS;
  const usedSeats = members.filter(m => m.status === 'active').length;
  const pendingInvites = invitations.filter(i => i.status === 'pending').length;

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login?redirect=/team');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchTeamData();
    }
  }, [session]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team data');
      const data = await res.json();
      setTeam(data.team || null);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch {
      // If API doesn't exist yet, show empty state
      setTeam({
        id: 'mock',
        name: 'My Team',
        slug: 'my-team',
        createdAt: new Date().toISOString(),
        plan: { includedSeats: 5, additionalSeats: 0, pricePerSeat: 5 },
      });
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
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      setSuccess(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setShowInviteModal(false);
      fetchTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to remove member');
      
      setSuccess('Member removed successfully');
      fetchTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleAddSeats = async () => {
    try {
      const res = await fetch('/api/team/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: seatsToAdd }),
      });
      
      if (!res.ok) throw new Error('Failed to add seats');
      
      setSuccess(`Added ${seatsToAdd} seat(s) to your team!`);
      setShowAddSeatsModal(false);
      setSeatsToAdd(1);
      fetchTeamData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add seats');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-400';
      case 'admin': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
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
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-400" />
                {team?.name || 'Team'}
              </h1>
              <p className="text-gray-400 mt-2">
                Manage your team members and subscription
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{usedSeats}/{totalSeats}</div>
              <div className="text-sm text-gray-400">seats used</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'members' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              activeTab === 'billing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Billing
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{usedSeats}</div>
                    <div className="text-sm text-gray-400">Active Members</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{pendingInvites}</div>
                    <div className="text-sm text-gray-400">Pending Invites</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalSeats - usedSeats - pendingInvites}</div>
                    <div className="text-sm text-gray-400">Available Seats</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 mb-6 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/30 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="font-semibold">{session?.user?.name || 'You'}</div>
                    <div className="text-sm text-gray-400">{session?.user?.email}</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-500/30 text-amber-300 rounded-full text-sm font-medium">
                  Owner
                </span>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchTeamData}
                    className="p-2 text-gray-400 hover:text-white transition"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : members.length === 0 && invitations.filter(i => i.status === 'pending').length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No team members yet</p>
                  <p className="text-sm text-gray-500">
                    Invite team members to collaborate on competitions
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
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
                            Pending • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                          {invite.role}
                        </span>
                        <button
                          onClick={() => {/* handleCancelInvite(invite.id) */}}
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

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={usedSeats + pendingInvites >= totalSeats}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="w-5 h-5" />
                Invite Member
              </button>
              <button
                onClick={() => setShowAddSeatsModal(true)}
                className="py-4 px-6 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Seats
              </button>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="font-semibold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Team Settings
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Team Name</label>
                <input
                  type="text"
                  defaultValue={team?.name || ''}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Team URL</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">codecomp.dev/team/</span>
                  <input
                    type="text"
                    defaultValue={team?.slug || ''}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Settings
                </h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-700" />
                  <span className="text-sm">Require admin approval for new members</span>
                </label>
              </div>

              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 border border-blue-500/30">
              <h2 className="font-semibold mb-4">Current Plan: Team</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Base seats</div>
                  <div className="text-lg font-semibold">{team?.plan.includedSeats || 5}</div>
                </div>
                <div>
                  <div className="text-gray-400">Additional seats</div>
                  <div className="text-lg font-semibold">{team?.plan.additionalSeats || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400">Base price</div>
                  <div className="text-lg font-semibold">$25/month</div>
                </div>
                <div>
                  <div className="text-gray-400">Additional seats cost</div>
                  <div className="text-lg font-semibold">${(team?.plan.additionalSeats || 0) * PRICE_PER_SEAT}/month</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="text-gray-400">Total monthly</div>
                  <div className="text-2xl font-bold">
                    ${25 + (team?.plan.additionalSeats || 0) * PRICE_PER_SEAT}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="font-semibold mb-4">Billing History</h3>
              <p className="text-gray-400 text-sm">
                View and download invoices from the{' '}
                <Link href="/settings/billing" className="text-blue-400 hover:underline">
                  billing settings page
                </Link>.
              </p>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  Invite Team Member
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleInvite}>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="member">Member - Can use Pro features</option>
                    <option value="admin">Admin - Can manage members</option>
                  </select>
                </div>
                
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
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Seats Modal */}
        {showAddSeatsModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  Add Seats
                </h3>
                <button onClick={() => setShowAddSeatsModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Number of seats to add</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSeatsToAdd(Math.max(1, seatsToAdd - 1))}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{seatsToAdd}</span>
                  <button
                    onClick={() => setSeatsToAdd(seatsToAdd + 1)}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Price per seat</span>
                  <span>${PRICE_PER_SEAT}/month</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Additional monthly cost</span>
                  <span>${seatsToAdd * PRICE_PER_SEAT}/month</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddSeatsModal(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSeats}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
                >
                  Add {seatsToAdd} Seat{seatsToAdd > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
