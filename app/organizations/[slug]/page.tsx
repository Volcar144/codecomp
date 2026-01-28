"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { 
  Code2, Users, Star, Trophy, Settings, UserPlus, LogOut,
  Crown, Shield, User, Copy, Check, ExternalLink
} from "lucide-react";

interface Member {
  user_id: string;
  username: string;
  role: string;
  joined_at: string;
}

interface Competition {
  competition_id: string;
  is_team_event: boolean;
  competitions: {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  website: string | null;
  type: string;
  is_public: boolean;
  invite_code: string;
  max_members: number;
  owner_id: string;
  created_at: string;
  organization_stats: {
    total_members: number;
    avg_skill_rating: number;
    total_competitions_won: number;
    total_submissions: number;
  } | null;
}

interface Membership {
  role: string;
  joined_at: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  moderator: <Shield className="h-4 w-4 text-green-500" />,
  member: <User className="h-4 w-4 text-gray-400" />,
};

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    fetchOrganization();
  }, [slug]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${slug}`);
      
      if (!response.ok) {
        throw new Error("Organization not found");
      }
      
      const data = await response.json();
      setOrganization(data.organization);
      setMembership(data.membership);
      setMembers(data.members || []);
      setCompetitions(data.competitions || []);
      setIsOwner(data.isOwner);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`/api/organizations/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join");
      }

      // Refresh organization data
      await fetchOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this organization?")) return;

    try {
      const response = await fetch(`/api/organizations/${slug}/join`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave");
      }

      router.push("/organizations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave");
    }
  };

  const copyInviteCode = () => {
    if (organization?.invite_code) {
      navigator.clipboard.writeText(organization.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Organization not found</h1>
          <Link href="/organizations" className="text-blue-400 hover:underline">
            Browse organizations
          </Link>
        </div>
      </div>
    );
  }

  const stats = organization.organization_stats;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/organizations" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Organizations
            </Link>
            <Link href="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Profile
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                organization.name[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{organization.name}</h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                  {organization.type}
                </span>
              </div>
              {organization.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">{organization.description}</p>
              )}
              {organization.website && (
                <a 
                  href={organization.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  {organization.website}
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {membership ? (
                <>
                  {isOwner || membership.role === "admin" ? (
                    <Link
                      href={`/organizations/${slug}/settings`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  ) : (
                    <button
                      onClick={handleLeave}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <LogOut className="h-4 w-4" />
                      Leave
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {organization.is_public ? (
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      {joining ? "Joining..." : "Join Organization"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                      />
                      <button
                        onClick={handleJoin}
                        disabled={joining || !inviteCode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        {joining ? "Joining..." : "Join with Code"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t dark:border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total_members || members.length}</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.avg_skill_rating || 1000}</p>
              <p className="text-sm text-gray-500">Avg Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total_competitions_won || 0}</p>
              <p className="text-sm text-gray-500">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total_submissions || 0}</p>
              <p className="text-sm text-gray-500">Submissions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </h2>
              
              {/* Invite Code for admins */}
              {(isOwner || membership?.role === "admin") && (
                <button
                  onClick={copyInviteCode}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : `Invite: ${organization.invite_code}`}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {members.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {member.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{member.username || `User ${member.user_id.slice(0, 8)}`}</p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS[member.role]}
                    <span className="text-sm capitalize text-gray-500">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitions & Activity */}
          <div className="space-y-6">
            {/* Recent Competitions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5" />
                Competitions
              </h2>
              {competitions.length > 0 ? (
                <div className="space-y-3">
                  {competitions.map(comp => (
                    <Link
                      key={comp.competition_id}
                      href={`/competitions/${comp.competitions.id}`}
                      className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <p className="font-medium">{comp.competitions.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          comp.competitions.status === "active" ? "bg-green-100 text-green-700" :
                          comp.competitions.status === "ended" ? "bg-gray-100 text-gray-600" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {comp.competitions.status}
                        </span>
                        {comp.is_team_event && (
                          <span className="text-blue-600">Team Event</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No competitions yet</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="capitalize">{organization.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visibility</span>
                  <span>{organization.is_public ? "Public" : "Private"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Members</span>
                  <span>{organization.max_members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{new Date(organization.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
