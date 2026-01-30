'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, CheckCircle, AlertCircle, Loader2, ArrowRight, 
  LogIn, UserPlus, X
} from 'lucide-react';

interface InviteInfo {
  valid: boolean;
  email: string;
  inviterName: string;
  planName: string;
  expiresAt: string;
  error?: string;
}

export default function FamilyInvitePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteInfo();
    }
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/family/invite/${token}`);
      const data = await res.json();
      
      if (!res.ok) {
        setInviteInfo({ 
          valid: false, 
          error: data.error || 'Invalid invitation',
          email: '',
          inviterName: '',
          planName: 'Family',
          expiresAt: '',
        });
      } else {
        setInviteInfo({
          valid: true,
          email: data.email,
          inviterName: data.inviterName,
          planName: data.planName || 'Family',
          expiresAt: data.expiresAt,
        });
      }
    } catch {
      setInviteInfo({ 
        valid: false, 
        error: 'Failed to load invitation',
        email: '',
        inviterName: '',
        planName: 'Family',
        expiresAt: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!session?.user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/family/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/family/invite/${token}/accept`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }
      
      setSuccess(true);
      
      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500 blur-xl opacity-30 rounded-full" />
              <CheckCircle className="w-20 h-20 text-green-500 relative" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Welcome to the Family! 🎉</h1>
          <p className="text-gray-400 mb-8">
            You now have access to all Pro features through the Family plan.
          </p>
          
          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-8 border border-pink-500/30">
            <p className="text-sm text-gray-300">
              Enjoy unlimited code executions, priority queue, 30-second timeouts, and more!
            </p>
          </div>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  if (!inviteInfo?.valid) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-30 rounded-full" />
              <X className="w-20 h-20 text-red-500 relative" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Invalid Invitation</h1>
          <p className="text-gray-400 mb-8">
            {inviteInfo?.error || 'This invitation link is invalid or has expired.'}
          </p>
          
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              View Plans
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-pink-500 blur-xl opacity-30 rounded-full" />
              <Users className="w-16 h-16 text-pink-500 relative" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">You&apos;re Invited!</h1>
          <p className="text-gray-400">
            <strong className="text-white">{inviteInfo.inviterName}</strong> has invited you to join their CodeComp {inviteInfo.planName} plan
          </p>
        </div>

        {/* Benefits Card */}
        <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 mb-6 border border-pink-500/30">
          <h3 className="font-semibold mb-4 text-center">What you&apos;ll get:</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Unlimited code executions</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Priority execution queue</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>30-second execution timeout</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>Private competitions</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>90-day execution history</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-4">
            All at no cost to you!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Expiry Warning */}
        <p className="text-center text-sm text-gray-500 mb-6">
          This invitation expires on {new Date(inviteInfo.expiresAt).toLocaleDateString()}
        </p>

        {/* Actions */}
        {!session?.user ? (
          <div className="space-y-3">
            <p className="text-center text-gray-400 mb-4">
              Sign in or create an account to accept this invitation
            </p>
            <Link
              href={`/login?redirect=/invite/family/${token}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </Link>
            <Link
              href={`/register?redirect=/invite/family/${token}&email=${encodeURIComponent(inviteInfo.email)}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {session.user.email !== inviteInfo.email && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 rounded-lg p-4 text-sm">
                <p>
                  <strong>Note:</strong> This invitation was sent to <strong>{inviteInfo.email}</strong>, 
                  but you&apos;re signed in as <strong>{session.user.email}</strong>. 
                  You can still accept if this is your account.
                </p>
              </div>
            )}
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="flex items-center justify-center gap-2 w-full py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Accept Invitation
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Maybe Later
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
