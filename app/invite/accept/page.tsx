'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { 
  UserPlus, CheckCircle, XCircle, Loader2, LogIn, 
  AlertCircle, Building2, Users
} from 'lucide-react';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'login-required'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationType, setOrganizationType] = useState<'family' | 'team' | null>(null);

  const invitationId = searchParams.get('id');

  useEffect(() => {
    if (sessionPending) return;
    
    if (!invitationId) {
      setStatus('error');
      setError('Invalid invitation link');
      return;
    }

    // If not logged in, prompt user to login
    if (!session?.user) {
      setStatus('login-required');
      return;
    }

    // User is logged in, proceed with accepting
    setStatus('loading');
    acceptInvitation();
  }, [invitationId, session, sessionPending]);

  const acceptInvitation = async () => {
    if (!invitationId) return;

    try {
      setStatus('accepting');

      // Accept the invitation using the organization plugin
      const { data, error: acceptError } = await authClient.organization.acceptInvitation({
        invitationId
      });

      if (acceptError) {
        throw new Error(acceptError.message || 'Failed to accept invitation');
      }

      // Get organization info after accepting
      if (data?.member?.organizationId) {
        const { data: orgData } = await authClient.organization.getFullOrganization();
        if (orgData) {
          setOrganizationName(orgData.name);
          const metadata = orgData.metadata as Record<string, unknown>;
          if (metadata?.type === 'family') {
            setOrganizationType('family');
          } else if (metadata?.type === 'team') {
            setOrganizationType('team');
          }
        }
      }

      setStatus('success');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  // Loading state
  if (sessionPending || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Login required
  if (status === 'login-required') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">You&apos;ve Been Invited!</h1>
          <p className="text-gray-400 mb-6">
            Sign in or create an account to join the organization.
          </p>
          <div className="space-y-3">
            <Link
              href={`/login?redirect=/invite/accept?id=${invitationId}`}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </Link>
            <Link
              href={`/register?redirect=/invite/accept?id=${invitationId}`}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Accepting state
  if (status === 'accepting') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Accepting invitation...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    const Icon = organizationType === 'family' ? Users : Building2;
    const redirectPath = organizationType === 'family' ? '/family' : '/team';

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
          <p className="text-gray-400 mb-6">
            You&apos;ve successfully joined{' '}
            <span className="text-white font-semibold">{organizationName || 'the organization'}</span>.
          </p>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-blue-400" />
              <div className="text-left">
                <div className="font-semibold">{organizationName}</div>
                <div className="text-sm text-gray-400">
                  {organizationType === 'family' ? 'Family Plan' : 'Team Plan'}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            You now have access to all Pro features included with your{' '}
            {organizationType === 'family' ? 'family' : 'team'} subscription.
          </p>

          <div className="space-y-3">
            <Link
              href={redirectPath}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <Icon className="w-5 h-5" />
              View {organizationType === 'family' ? 'Family' : 'Team'}
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Invitation Error</h1>
        
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">
            {error || 'This invitation is invalid or has expired.'}
          </p>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Possible reasons:
        </p>
        <ul className="text-left text-sm text-gray-500 space-y-2 mb-6">
          <li>• The invitation link has expired</li>
          <li>• The invitation was canceled by the owner</li>
          <li>• You&apos;ve already accepted this invitation</li>
          <li>• The invitation was for a different email address</li>
        </ul>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition flex items-center justify-center"
          >
            Go to Dashboard
          </Link>
          <p className="text-xs text-gray-600">
            Contact the organization owner if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
