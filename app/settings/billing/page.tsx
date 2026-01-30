'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { 
  Crown, CreditCard, Calendar, AlertCircle, 
  Loader2, ExternalLink, CheckCircle, XCircle 
} from 'lucide-react';

interface SubscriptionData {
  tier: 'free' | 'pro';
  isActive: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
  limits: {
    dailyExecutions: number;
    executionTimeout: number;
    historyDays: number;
    privateCompetitions: boolean;
    priorityQueue: boolean;
  };
}

export default function BillingPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/stripe/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchSubscription();
    } else if (!sessionPending) {
      setLoading(false);
    }
  }, [session, sessionPending]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to view billing</p>
          <Link href="/login" className="text-blue-500 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const isPro = subscription?.tier === 'pro' && subscription?.isActive;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/settings" className="text-gray-400 hover:text-white">
            &larr; Back to Settings
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current Plan</h2>
            {isPro ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm">
                <Crown className="w-4 h-4" />
                Pro
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">
                Free
              </span>
            )}
          </div>

          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Subscription Active</span>
              </div>
              
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'} on{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>Subscription will not renew</span>
                </div>
              )}

              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                {portalLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                Manage Subscription
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400">
                Upgrade to Pro for unlimited executions and premium features.
              </p>
              <Link
                href="/pro"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                <Crown className="w-5 h-5" />
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>

        {/* Usage Limits */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Your Limits</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-400">Daily Executions</span>
              <span className="font-medium">
                {subscription?.limits.dailyExecutions === Infinity 
                  ? 'Unlimited' 
                  : subscription?.limits.dailyExecutions || 30}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-400">Execution Timeout</span>
              <span className="font-medium">
                {subscription?.limits.executionTimeout || 10} seconds
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-400">Execution History</span>
              <span className="font-medium">
                {subscription?.limits.historyDays || 7} days
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <span className="text-gray-400">Private Competitions</span>
              {subscription?.limits.privateCompetitions ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-600" />
              )}
            </div>
            
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-400">Priority Queue</span>
              {subscription?.limits.priorityQueue ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Questions about billing?{' '}
            <a href="mailto:support@codecomp.dev" className="text-blue-400 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
