"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { 
  Code2, Users, Building2, GraduationCap, Briefcase, Globe,
  Plus, Search, Star, Trophy, ChevronRight
} from "lucide-react";

interface OrganizationStats {
  total_members: number;
  avg_skill_rating: number;
  total_competitions_won: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  type: string;
  is_public: boolean;
  created_at: string;
  organization_stats: OrganizationStats | null;
  role?: string;
  joined_at?: string;
}

const ORG_TYPE_ICONS: Record<string, React.ReactNode> = {
  team: <Users className="h-5 w-5" />,
  school: <GraduationCap className="h-5 w-5" />,
  company: <Briefcase className="h-5 w-5" />,
  community: <Globe className="h-5 w-5" />,
};

const ORG_TYPE_COLORS: Record<string, string> = {
  team: "bg-blue-100 text-blue-700",
  school: "bg-green-100 text-green-700",
  company: "bg-purple-100 text-purple-700",
  community: "bg-orange-100 text-orange-700",
};

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, [search, typeFilter, session]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (session?.user) params.set("my", "true");

      const response = await fetch(`/api/organizations?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }
      
      const data = await response.json();
      setOrganizations(data.organizations || []);
      setMyOrganizations(data.myOrganizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/competitions" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Competitions
            </Link>
            <Link href="/duels" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Duels
            </Link>
            <Link href="/profile" className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900">
              Profile
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Organizations</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Join teams, schools, or communities to compete together
            </p>
          </div>
          {session?.user && (
            <Link
              href="/organizations/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Create Organization
            </Link>
          )}
        </div>

        {/* My Organizations */}
        {myOrganizations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">My Organizations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myOrganizations.map(org => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        org.name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{org.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${ORG_TYPE_COLORS[org.type] || ORG_TYPE_COLORS.team}`}>
                          {org.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{org.role}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex gap-2">
              {[
                { id: null, label: "All", icon: <Building2 className="h-4 w-4" /> },
                { id: "team", label: "Teams", icon: <Users className="h-4 w-4" /> },
                { id: "school", label: "Schools", icon: <GraduationCap className="h-4 w-4" /> },
                { id: "company", label: "Companies", icon: <Briefcase className="h-4 w-4" /> },
                { id: "community", label: "Communities", icon: <Globe className="h-4 w-4" /> },
              ].map(type => (
                <button
                  key={type.id || "all"}
                  onClick={() => setTypeFilter(type.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === type.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {type.icon}
                  <span className="hidden md:inline">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Organizations List */}
        {loading ? (
          <Loading />
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(org => {
              const stats = org.organization_stats;
              return (
                <Link
                  key={org.id}
                  href={`/organizations/${org.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          org.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{org.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${ORG_TYPE_COLORS[org.type] || ORG_TYPE_COLORS.team}`}>
                          {ORG_TYPE_ICONS[org.type]}
                          {org.type}
                        </span>
                      </div>
                    </div>
                    
                    {org.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {org.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {stats?.total_members || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {stats?.avg_skill_rating || 1000} avg
                      </span>
                      {(stats?.total_competitions_won || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          {stats?.total_competitions_won}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No Organizations Found</h3>
            <p className="text-gray-500 mb-4">
              {search ? "Try a different search term" : "Be the first to create one!"}
            </p>
            {session?.user && (
              <Link
                href="/organizations/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                Create Organization
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
