'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { Check, Zap, Lock, History, Crown, Rocket, Timer, Loader2 } from 'lucide-react';

const FREE_FEATURES = [
  'All tutorials & daily challenges',
  'All 7 programming languages',
  'Public competitions',
  'Leaderboards & achievements',
  '30 code executions/day',
  '7-day execution history',
];

const PRO_FEATURES = [
  { icon: Zap, text: 'Unlimited code executions', highlight: true },
  { icon: Rocket, text: 'Priority queue (faster during peak)', highlight: true },
  { icon: Lock, text: 'Private competitions (invite-only)' },
  { icon: History, text: '90-day execution history' },
  { icon: Crown, text: 'Pro badge on your profile' },
  { icon: Timer, text: 'Longer timeouts (30s vs 10s)' },
];

export default function ProPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async () => {
    if (!session?.user) {
      window.location.href = '/login?redirect=/pro';
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: billingInterval }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = 5;
  const yearlyPrice = 48; // $4/month when paid yearly
  const currentPrice = billingInterval === 'monthly' ? monthlyPrice : yearlyPrice;
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            &larr; CodeComp
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm mb-6">
          <Crown className="w-4 h-4" />
          Support the platform
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          CodeComp <span className="text-blue-500">Pro</span>
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Unlock premium features and help keep CodeComp running for everyone.
          All core features remain free forever.
        </p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          {/* Free Tier */}
          <div className="bg-gray-900 rounded-2xl p-8 text-left border border-gray-800">
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Free</h3>
            <div className="text-4xl font-bold mb-6">
              $0<span className="text-lg text-gray-500">/forever</span>
            </div>
            
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <Link 
              href="/register"
              className="mt-8 block w-full py-3 text-center border border-gray-700 rounded-lg hover:bg-gray-800 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-blue-900/30 to-gray-900 rounded-2xl p-8 text-left border border-blue-500/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-sm font-semibold rounded-full">
              Most Popular
            </div>
            
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Pro</h3>
            
            {/* Billing Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  billingInterval === 'monthly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  billingInterval === 'yearly' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Yearly
                <span className="ml-1 text-green-400 text-xs">Save 20%</span>
              </button>
            </div>

            <div className="text-4xl font-bold mb-2">
              ${currentPrice}<span className="text-lg text-gray-500">/{billingInterval === 'monthly' ? 'month' : 'year'}</span>
            </div>
            {billingInterval === 'yearly' && (
              <p className="text-green-400 text-sm mb-4">That&apos;s just $4/month!</p>
            )}
            <p className="text-gray-500 text-sm mb-6">Cancel anytime</p>
            
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature, i) => (
                <li key={i} className={`flex items-start gap-3 ${feature.highlight ? 'text-white' : 'text-gray-300'}`}>
                  <feature.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${feature.highlight ? 'text-blue-400' : 'text-blue-500/70'}`} />
                  {feature.text}
                </li>
              ))}
            </ul>
            
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-8 w-full py-3 text-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : session?.user ? (
                'Subscribe Now'
              ) : (
                'Sign in to Subscribe'
              )}
            </button>

            {session?.user && (
              <button
                onClick={handleManageSubscription}
                className="mt-3 w-full py-2 text-center text-gray-400 hover:text-white text-sm transition"
              >
                Already subscribed? Manage billing →
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto text-left mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Is my payment secure?</h3>
              <p className="text-gray-400">
                Yes! We use Stripe, the same payment processor trusted by millions of businesses 
                worldwide. We never see or store your card details.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Will free features ever become paid?</h3>
              <p className="text-gray-400">
                No. We&apos;re committed to keeping the core experience free. Pro is for power users 
                who want extra features and want to support the platform.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">What happens if I cancel?</h3>
              <p className="text-gray-400">
                You keep access until the end of your billing period, then revert to the free tier. 
                Your data and progress are never deleted.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Can I get a refund?</h3>
              <p className="text-gray-400">
                Yes! Contact us within 7 days of your payment and we&apos;ll refund you, no questions asked.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Where does the money go?</h3>
              <p className="text-gray-400">
                100% goes to running costs: hosting (Vercel), code execution servers (VPS), 
                and domain. This is a passion project, not a business.
              </p>
            </div>
          </div>
        </div>

        {/* Support alternatives */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <p className="text-gray-500 mb-4">Not ready to subscribe? You can also:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="https://github.com/Volcar144/codecomp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ⭐ Star on GitHub
            </a>
            <a 
              href="https://twitter.com/intent/tweet?text=Check%20out%20CodeComp%20-%20a%20free%20coding%20competition%20platform!&url=https://codecomp.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              🐦 Share on Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
