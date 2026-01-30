'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Crown, AlertTriangle, X } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

interface ExecutionInfo {
  remaining: number;
  limit: number;
  plan: string;
}

interface ExecutionLimitBannerProps {
  executionInfo?: ExecutionInfo | null;
  className?: string;
  compact?: boolean;
}

export function ExecutionLimitBanner({ 
  executionInfo, 
  className = '',
  compact = false 
}: ExecutionLimitBannerProps) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  // Don't show for paid users or if dismissed
  if (dismissed || !session?.user || !executionInfo) {
    return null;
  }

  // Don't show for unlimited plans
  if (executionInfo.limit === Infinity || executionInfo.plan !== 'free') {
    return null;
  }

  const percentUsed = ((executionInfo.limit - executionInfo.remaining) / executionInfo.limit) * 100;
  const isLow = executionInfo.remaining <= 10;
  const isVeryLow = executionInfo.remaining <= 5;
  const isExhausted = executionInfo.remaining === 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Zap className={`w-4 h-4 ${isVeryLow ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-400'}`} />
        <span className={isVeryLow ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-gray-400'}>
          {executionInfo.remaining}/{executionInfo.limit}
        </span>
        {isLow && (
          <Link href="/pricing" className="text-blue-400 hover:underline text-xs">
            Upgrade
          </Link>
        )}
      </div>
    );
  }

  if (isExhausted) {
    return (
      <div className={`bg-red-500/10 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-400">Daily limit reached</h4>
            <p className="text-sm text-gray-400 mt-1">
              You've used all {executionInfo.limit} free executions for today.
              Upgrade to Pro for unlimited executions.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-sm font-medium transition"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </Link>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-500 hover:text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isLow) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">
              <span className="text-yellow-400 font-medium">{executionInfo.remaining}</span>
              <span className="text-gray-400"> of {executionInfo.limit} executions remaining today</span>
            </span>
          </div>
          <Link
            href="/pricing"
            className="text-sm text-blue-400 hover:underline flex items-center gap-1"
          >
            <Crown className="w-3.5 h-3.5" />
            Get unlimited
          </Link>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-300"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>
    );
  }

  // Show subtle indicator when above 50% used
  if (percentUsed >= 50) {
    return (
      <div className={`flex items-center justify-between text-sm text-gray-400 ${className}`}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>{executionInfo.remaining} executions left today</span>
        </div>
        <Link href="/pricing" className="text-blue-400 hover:underline text-xs">
          Unlimited with Pro
        </Link>
      </div>
    );
  }

  return null;
}

// Hook to fetch execution limits
export function useExecutionLimits() {
  const { data: session } = useSession();
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLimits = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/execute');
      const data = await res.json();
      if (data.userLimits) {
        setExecutionInfo(data.userLimits);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, [session]);

  return { executionInfo, loading, refetch: fetchLimits, setExecutionInfo };
}
