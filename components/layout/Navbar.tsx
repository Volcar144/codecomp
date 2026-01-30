"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Code2, Trophy, Swords, Calendar, Users, Award, Eye, GraduationCap,
  Bell, Menu, X, ChevronDown, User, LogOut, Settings, BarChart3,
  Building2, UserPlus, Play, Target, Crown, Heart
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: "Competitions", href: "/competitions", icon: <Trophy className="h-4 w-4" /> },
  { label: "Duels", href: "/duels", icon: <Swords className="h-4 w-4" /> },
  { label: "Daily", href: "/daily", icon: <Calendar className="h-4 w-4" /> },
  { label: "Leaderboard", href: "/leaderboard/skill", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Tutorial", href: "/tutorial", icon: <GraduationCap className="h-4 w-4" /> },
];

const moreNavItems: NavItem[] = [
  { label: "Playground", href: "/playground", icon: <Play className="h-4 w-4" /> },
  { label: "Practice", href: "/practice", icon: <Target className="h-4 w-4" /> },
  { label: "Organizations", href: "/organizations", icon: <Building2 className="h-4 w-4" /> },
  { label: "Achievements", href: "/achievements", icon: <Award className="h-4 w-4" /> },
  { label: "Spectate", href: "/spectate", icon: <Eye className="h-4 w-4" /> },
  { label: "Friends", href: "/friends", icon: <Users className="h-4 w-4" /> },
  { label: "Arenas", href: "/arenas", icon: <Code2 className="h-4 w-4" /> },
];

export default function Navbar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCount] = useState(0); // Would be fetched from API

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b bg-white dark:bg-gray-900 shadow-sm">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold hidden sm:block">CodeComp</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                onBlur={() => setTimeout(() => setMoreDropdownOpen(false), 200)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                More
                <ChevronDown className={`h-4 w-4 transition-transform ${moreDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {moreDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1">
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 text-sm ${
                        isActive(item.href)
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Pro Link */}
            <Link
              href="/pro"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-500 hover:from-amber-500/20 hover:to-yellow-500/20 rounded-full transition"
            >
              <Crown className="h-4 w-4" />
              Pro
            </Link>

            {isPending ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : session?.user ? (
              <>
                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    onBlur={() => setTimeout(() => setProfileDropdownOpen(false), 200)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                      {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1">
                      <div className="px-4 py-2 border-b dark:border-gray-700">
                        <p className="text-sm font-medium truncate">{session.user.name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/friends"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        Friends
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <div className="border-t dark:border-gray-700 mt-1 pt-1">
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t dark:border-gray-700 py-4">
            <div className="flex flex-col gap-1">
              {[...mainNavItems, ...moreNavItems].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    isActive(item.href)
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              
              {/* Pro & Support */}
              <div className="border-t dark:border-gray-700 mt-2 pt-2">
                <Link
                  href="/pro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
                <a
                  href="https://ko-fi.com/codecomp"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                >
                  <Heart className="h-4 w-4" />
                  Support Us
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
