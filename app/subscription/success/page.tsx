'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Crown, Users, Building2, ArrowRight, Loader2, UserPlus, Settings } from 'lucide-react';

type PlanType = 'pro' | 'family' | 'team';

interface PlanInfo {
  name: string;
  displayName: string;
  icon: typeof Crown;
  iconColor: string;
  bgGradient: string;
  features: string[];
  primaryCta: { label: string; href: string; icon?: typeof ArrowRight };
  secondaryCta?: { label: string; href: string };
  seats?: number;
}

const PLAN_INFO: Record<PlanType, PlanInfo> = {
  pro: {
    name: 'pro',
    displayName: 'Pro',
    icon: Crown,
    iconColor: 'text-amber-400',
    bgGradient: 'from-amber-500/20 to-orange-500/20',
    features: [
      'Unlimited code executions',
      'Priority execution queue',
      '30-second execution timeout',
      'Private competitions',
      '90-day execution history',
    ],
    primaryCta: { label: 'Start Competing', href: '/competitions', icon: ArrowRight },
    secondaryCta: { label: 'Go to Dashboard', href: '/dashboard' },
  },
  family: {
    name: 'family',
    displayName: 'Family',
    icon: Users,
    iconColor: 'text-pink-400',
    bgGradient: 'from-pink-500/20 to-purple-500/20',
    features: [
      'Everything in Pro',
      '3 member seats included',
      'Share with family or friends',
      'Each member gets their own account',
      'Manage members anytime',
    ],
    primaryCta: { label: 'Invite Family Members', href: '/family', icon: UserPlus },
    secondaryCta: { label: 'Go to Dashboard', href: '/dashboard' },
    seats: 3,
  },
  team: {
    name: 'team',
    displayName: 'Team',
    icon: Building2,
    iconColor: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
    features: [
      'Everything in Pro',
      '5 member seats included',
      'Add more seats at $5/seat/month',
      'Team administration dashboard',
      'Usage analytics & insights',
    ],
    primaryCta: { label: 'Set Up Your Team', href: '/team', icon: Settings },
    secondaryCta: { label: 'Go to Dashboard', href: '/dashboard' },
    seats: 5,
  },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const planParam = searchParams.get('plan');
  const [loading, setLoading] = useState(true);

  // Determine plan from URL param or default to pro
  const plan = (PLAN_INFO[planParam as PlanType]) ? planParam as PlanType : 'pro';
  const planInfo = PLAN_INFO[plan];
  const Icon = planInfo.icon;
  const CtaIcon = planInfo.primaryCta.icon;

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
          <p className="text-gray-400">Setting up your {planInfo.displayName} account...</p>
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
        <h1 className="text-3xl font-bold mb-4">Welcome to {planInfo.displayName}! 🎉</h1>
        <p className="text-gray-400 mb-8">
          Your subscription is now active. Thank you for supporting CodeComp!
        </p>

        {/* Plan Badge Preview */}
        <div className={`bg-gradient-to-br ${planInfo.bgGradient} rounded-xl p-6 mb-8 border border-gray-800`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icon className={`w-6 h-6 ${planInfo.iconColor}`} />
            <span className="text-lg font-semibold">{planInfo.displayName} Member</span>
          </div>
          {planInfo.seats && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300 mb-2">
              <Users className="w-4 h-4" />
              <span>{planInfo.seats} seats included</span>
            </div>
          )}
          <p className="text-sm text-gray-400">
            {plan === 'pro' && 'You now have access to unlimited executions, priority queue, private competitions, and more.'}
            {plan === 'family' && 'Invite up to 2 family members to share all Pro benefits!'}
            {plan === 'team' && 'Set up your team and start collaborating with Pro features!'}
          </p>
        </div>

        {/* What's Unlocked */}
        <div className="space-y-3 mb-8 text-left">
          <h3 className="font-semibold text-center mb-4">What&apos;s unlocked:</h3>
          {planInfo.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Next Steps for Family/Team */}
        {(plan === 'family' || plan === 'team') && (
          <div className="bg-gray-900 rounded-xl p-4 mb-8 border border-gray-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Next Step: Invite Members
            </h4>
            <p className="text-sm text-gray-400">
              {plan === 'family' 
                ? 'Share CodeComp with up to 2 family members or friends. They\'ll get their own accounts with all Pro benefits.'
                : 'Add your team members and manage their access from the team dashboard.'}
            </p>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href={planInfo.primaryCta.href}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            {planInfo.primaryCta.label}
            {CtaIcon && <CtaIcon className="w-5 h-5" />}
          </Link>
          {planInfo.secondaryCta && (
            <Link
              href={planInfo.secondaryCta.href}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              {planInfo.secondaryCta.label}
            </Link>
          )}
        </div>

        {/* Receipt Info */}
        <p className="text-xs text-gray-500 mt-8">
          A receipt has been sent to your email. You can manage your subscription in{' '}
          <Link href="/settings/billing" className="text-blue-400 hover:underline">
            billing settings
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
