'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, subscription } from '@/lib/auth-client';
import { 
  Check, Zap, Lock, History, Crown, Rocket, Timer, Loader2,
  Users, Building2, Heart, X, ChevronDown
} from 'lucide-react';

// Plan definitions matching lib/auth.ts stripe plugin config
const PLANS = {
  pro: {
    name: 'Pro',
    planId: 'pro', // matches auth.ts plan name
    description: 'For individual power users',
    monthlyPrice: 5,
    yearlyPrice: 48,
    features: [
      'Unlimited code executions',
      'Priority execution queue',
      '30-second timeout (vs 10s)',
      'Private competitions',
      '90-day execution history',
      'Pro badge on profile',
    ],
    icon: Crown,
    color: 'blue',
  },
  family: {
    name: 'Family',
    planId: 'family',
    description: 'Share with up to 3 people',
    monthlyPrice: 12,
    yearlyPrice: 99,
    seats: 3,
    features: [
      'Everything in Pro',
      '3 member seats included',
      'Shared family dashboard',
      'Family leaderboard',
      'Perfect for households',
    ],
    icon: Heart,
    color: 'pink',
  },
  team: {
    name: 'Team',
    planId: 'team',
    description: 'For organizations & teams',
    monthlyPrice: 25,
    yearlyPrice: 240,
    baseSeats: 5,
    perSeatPrice: 5,
    features: [
      'Everything in Pro',
      '5 member seats included',
      'Additional seats $5/user/mo',
      'Team analytics dashboard',
      'Admin controls & roles',
      'Priority support',
    ],
    icon: Building2,
    color: 'purple',
  },
};

const FREE_FEATURES = [
  'All tutorials & challenges',
  'All 7 languages',
  'Public competitions',
  '30 executions/day',
  '10-second timeout',
];

type PlanType = 'pro' | 'family' | 'team';
type BillingInterval = 'monthly' | 'yearly';

export default function PricingPage() {
  const { data: session, isPending } = useSession();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [teamSeats, setTeamSeats] = useState(5);
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use BetterAuth's subscription.upgrade() which redirects to Stripe Checkout
  const handleSelectPlan = async (plan: PlanType) => {
    if (!session?.user) {
      window.location.href = `/login?redirect=/pricing&plan=${plan}`;
      return;
    }
    
    setLoading(plan);
    setError(null);
    
    try {
      // BetterAuth creates the checkout session and redirects to Stripe
      const { data, error: upgradeError } = await subscription.upgrade({
        plan: plan,
        successUrl: `${window.location.origin}/pro/success`,
        cancelUrl: `${window.location.origin}/pricing`,
        // For team plans, pass the number of seats
        ...(plan === 'team' && { seats: teamSeats }),
      });
      
      if (upgradeError) {
        setError(upgradeError.message || 'Failed to start checkout');
        return;
      }
      
      // BetterAuth should automatically redirect, but handle URL if returned
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('pro'); // Just use as loading indicator
    try {
      const { data, error } = await subscription.billingPortal({
        returnUrl: window.location.href,
      });
      
      if (data?.url) {
        window.location.href = data.url;
      } else if (error) {
        alert(error.message || 'Failed to open billing portal');
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoading(null);
    }
  };

  const calculateTeamPrice = () => {
    const plan = PLANS.team;
    const extraSeats = Math.max(0, teamSeats - plan.baseSeats);
    const basePrice = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const seatPrice = extraSeats * plan.perSeatPrice * (billingInterval === 'yearly' ? 10 : 1);
    return basePrice + seatPrice;
  };

  const getPrice = (plan: PlanType) => {
    if (plan === 'team') {
      return calculateTeamPrice();
    }
    return billingInterval === 'monthly' 
      ? PLANS[plan].monthlyPrice 
      : PLANS[plan].yearlyPrice;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            ← CodeComp
          </Link>
          {session?.user && (
            <button
              onClick={handleManageBilling}
              disabled={loading !== null}
              className="text-sm text-gray-400 hover:text-white disabled:cursor-wait"
            >
              {loading !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Manage Billing'}
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Start free, upgrade when you need more. All plans include a 7-day free trial.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-2 p-1 bg-gray-900 rounded-lg mb-12">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              billingInterval === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              billingInterval === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-green-400">Save 20%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="bg-gray-900 rounded-2xl p-6 text-left border border-gray-800">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Free</h3>
            <div className="text-3xl font-bold mb-4">
              $0<span className="text-sm text-gray-500">/forever</span>
            </div>
            <p className="text-gray-400 text-sm mb-6">Perfect for getting started</p>
            
            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <Link 
              href="/register"
              className="block w-full py-2.5 text-center border border-gray-700 rounded-lg hover:bg-gray-800 transition text-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-blue-900/20 to-gray-900 rounded-2xl p-6 text-left border border-blue-500/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-xs font-semibold rounded-full">
              Most Popular
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-400">Pro</h3>
            </div>
            <div className="text-3xl font-bold mb-1">
              ${getPrice('pro')}<span className="text-sm text-gray-500">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            {billingInterval === 'yearly' && (
              <p className="text-green-400 text-xs mb-4">$4/month billed yearly</p>
            )}
            <p className="text-gray-400 text-sm mb-6">{PLANS.pro.description}</p>
            
            <ul className="space-y-3 mb-6">
              {PLANS.pro.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={loading === 'pro'}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-wait rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
            >
              {loading === 'pro' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>

          {/* Family Plan */}
          <div className="bg-gradient-to-b from-pink-900/20 to-gray-900 rounded-2xl p-6 text-left border border-pink-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-pink-400">Family</h3>
            </div>
            <div className="text-3xl font-bold mb-1">
              ${getPrice('family')}<span className="text-sm text-gray-500">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            {billingInterval === 'yearly' && (
              <p className="text-green-400 text-xs mb-4">~$8.25/month billed yearly</p>
            )}
            <p className="text-gray-400 text-sm mb-6">{PLANS.family.description}</p>
            
            <ul className="space-y-3 mb-6">
              {PLANS.family.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSelectPlan('family')}
              disabled={loading === 'family'}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 disabled:cursor-wait rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
            >
              {loading === 'family' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>

          {/* Team Plan */}
          <div className="bg-gradient-to-b from-purple-900/20 to-gray-900 rounded-2xl p-6 text-left border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-purple-400">Team</h3>
            </div>
            <div className="text-3xl font-bold mb-1">
              ${getPrice('team')}<span className="text-sm text-gray-500">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">{PLANS.team.description}</p>
            
            {/* Seat Selector */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <label className="text-xs text-gray-400 mb-1 block">Team size</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTeamSeats(Math.max(5, teamSeats - 1))}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 transition"
                >
                  -
                </button>
                <span className="flex-1 text-center font-medium">{teamSeats} seats</span>
                <button
                  onClick={() => setTeamSeats(teamSeats + 1)}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 transition"
                >
                  +
                </button>
              </div>
              {teamSeats > 5 && (
                <p className="text-xs text-gray-500 mt-1">
                  +${(teamSeats - 5) * 5}/mo for {teamSeats - 5} extra seats
                </p>
              )}
            </div>
            
            <ul className="space-y-3 mb-6">
              {PLANS.team.features.slice(0, 4).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleSelectPlan('team')}
              disabled={loading === 'team'}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-wait rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
            >
              {loading === 'team' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20 text-left">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="font-semibold mb-2">What happens after the free trial?</h3>
              <p className="text-gray-400 text-sm">
                After 7 days, you&apos;ll be charged for your selected plan. You can cancel anytime 
                before the trial ends and won&apos;t be charged.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="font-semibold mb-2">Can I switch plans?</h3>
              <p className="text-gray-400 text-sm">
                Yes! You can upgrade or downgrade at any time. When upgrading, you&apos;ll be 
                prorated for the remainder of your billing period.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="font-semibold mb-2">How do Team seats work?</h3>
              <p className="text-gray-400 text-sm">
                The Team plan includes 5 seats. Additional seats are $5/month each. 
                You can add or remove seats anytime from your billing settings.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="font-semibold mb-2">Is my payment secure?</h3>
              <p className="text-gray-400 text-sm">
                Yes, we use Stripe for payment processing. Your card details are never 
                stored on our servers and are encrypted end-to-end.
              </p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@codecomp.dev" className="text-blue-400 hover:underline">
              support@codecomp.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
