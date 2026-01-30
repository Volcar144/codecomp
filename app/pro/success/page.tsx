'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Give webhook time to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Setting up your Pro account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-500 blur-xl opacity-30 rounded-full" />
            <CheckCircle className="w-20 h-20 text-green-500 relative" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">Welcome to Pro! 🎉</h1>
        <p className="text-gray-400 mb-8">
          Your subscription is now active. Thank you for supporting CodeComp!
        </p>

        {/* Pro Badge Preview */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-amber-400" />
            <span className="text-lg font-semibold">Pro Member</span>
          </div>
          <p className="text-sm text-gray-400">
            You now have access to unlimited executions, priority queue, 
            private competitions, and more.
          </p>
        </div>

        {/* What's Next */}
        <div className="space-y-3 mb-8 text-left">
          <h3 className="font-semibold text-center mb-4">What&apos;s unlocked:</h3>
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
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/competitions"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Start Competing
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Receipt Info */}
        <p className="mt-8 text-sm text-gray-500">
          A receipt has been sent to your email. You can manage your 
          subscription in{' '}
          <Link href="/settings/billing" className="text-blue-400 hover:underline">
            Settings → Billing
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ProSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
