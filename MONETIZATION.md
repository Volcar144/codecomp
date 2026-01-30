# CodeComp Monetization Guide

**Target**: $35-40/month to cover Vercel Pro + Domain + VPS

## 💡 Non-Aggressive Strategy

Keep the core experience **100% free**. Monetize through optional upgrades and donations.

---

## Option 1: "Pro" Subscription ($5/month)

**You need: 7-8 subscribers to break even**

### What stays FREE:
- ✅ All tutorials
- ✅ Daily challenges
- ✅ Public competitions
- ✅ Leaderboards
- ✅ All 7 programming languages
- ✅ 30 code executions/day
- ✅ 10-second execution timeout
- ✅ 7-day execution history

### Pro Features ($5/month):
- ⭐ Unlimited code executions
- ⭐ Priority execution queue (faster during peak times)
- ⭐ 30-second execution timeout (for complex algorithms)
- ⭐ Private competitions (invite-only)
- ⭐ 90-day execution history
- ⭐ Pro badge on profile
- ⭐ Early access to new features
- ⭐ No ads (if you add any)

### Implementation:

```sql
-- Add to user_profiles table
ALTER TABLE user_profiles ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
```

**Payment options** (easiest to hardest):
1. **Ko-fi** - No code needed, link to Ko-fi membership
2. **Stripe** - $0 until you make money, then 2.9% + $0.30
3. **Paddle/Lemon Squeezy** - Handles taxes for you

---

## Option 2: GitHub Sponsors / Ko-fi (Donations)

**Easiest to implement - zero code changes**

### Setup Ko-fi:
1. Create account at ko-fi.com
2. Enable monthly memberships
3. Add button to your site

```tsx
// components/SupportButton.tsx
export function SupportButton() {
  return (
    <a 
      href="https://ko-fi.com/yourusername" 
      target="_blank"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] text-white rounded-lg hover:bg-[#ff4442] transition"
    >
      ☕ Support CodeComp
    </a>
  );
}
```

### Ko-fi Tiers:
| Tier | Price | Perks |
|------|-------|-------|
| Supporter | $3/mo | Name on supporters page, Discord role |
| Pro | $5/mo | All Pro features above |
| Champion | $10/mo | Pro + custom profile badge |

**Realistic**: 10-15 supporters at $3-5 = $30-60/month

---

## Option 3: One-Time Purchases

### Competition Hosting ($5-20)
Let users pay to host larger competitions:

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 10 participants, 3 problems |
| Standard | $5 | 50 participants, 10 problems |
| Large | $15 | 200 participants, unlimited problems |
| Enterprise | $50 | Unlimited, custom branding |

### Premium Templates ($2-5)
Sell curated algorithm template packs:
- Interview Prep Pack ($5) - 20 templates
- System Design Pack ($5)
- Contest Templates ($3)

---

## Option 4: Subtle Ads (Non-Intrusive)

**Only if you have 1000+ monthly users**

### Carbon Ads (Developer-focused)
- Pays ~$2-4 CPM
- 10,000 pageviews = ~$20-40/month
- Single small ad, relevant to developers

```tsx
// components/CarbonAd.tsx
'use client';
import { useEffect, useRef } from 'react';

export function CarbonAd() {
  const adRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//cdn.carbonads.com/carbon.js?serve=YOUR_ID&placement=yoursite';
    script.async = true;
    adRef.current?.appendChild(script);
  }, []);
  
  return <div ref={adRef} className="carbon-ad" />;
}
```

**Pro users see no ads** - incentive to subscribe!

---

## Option 5: Affiliate Links

Add affiliate links to learning resources:

| Product | Commission |
|---------|------------|
| Coding courses (Udemy, Coursera) | 10-40% |
| Books (Amazon) | 3-4% |
| Dev tools (JetBrains, etc.) | 10-30% |

Example: "Want to learn more? Check out [Course Name] (affiliate link)"

**Non-aggressive**: Only on educational pages, clearly marked.

---

## 🎯 Recommended Stack (Minimal Effort)

### Phase 1: Donations (Day 1)
1. Set up Ko-fi with $3 and $5 tiers
2. Add "Support" button to footer and profile
3. Time: 30 minutes

### Phase 2: Soft Limits (Week 1)
1. Track daily executions per user
2. Show "You've used 27/30 free executions today"
3. Link to Ko-fi Pro tier
4. Time: 2-3 hours

### Phase 3: Pro Features (Month 1)
1. Add subscription_tier to profiles
2. Gate private competitions behind Pro
3. Integrate Stripe or use Ko-fi webhooks
4. Time: 1-2 days

---

## Implementation: Execution Limits

```typescript
// lib/rate-limit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function checkExecutionLimit(userId: string, tier: 'free' | 'pro') {
  const key = `exec:${userId}:${new Date().toISOString().split('T')[0]}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 86400); // 24 hours
  }
  
  const limit = tier === 'pro' ? Infinity : 30;
  
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit
  };
}
```

```typescript
// In /api/execute/route.ts
const { allowed, remaining } = await checkExecutionLimit(userId, user.tier);

if (!allowed) {
  return NextResponse.json({
    error: 'Daily limit reached. Upgrade to Pro for unlimited executions!',
    upgradeUrl: '/pro'
  }, { status: 429 });
}

// Include in response
return NextResponse.json({ 
  result, 
  executions: { remaining, limit: user.tier === 'pro' ? '∞' : 30 } 
});
```

---

## Pricing Psychology

### Why $5/month works:
- Less than a coffee
- Round number, easy to remember
- 7-8 subscribers = break even
- Low enough that users don't overthink it

### Why NOT to go lower:
- $3/month needs 12+ subscribers
- Payment processing fees eat into margins
- Perceived value is lower

### Why NOT to go higher:
- $10/month feels like a "real" subscription
- Users compare to Netflix, Spotify
- Higher churn rate

---

## Revenue Projections

| Monthly Users | Conversion | Subscribers | Revenue |
|---------------|------------|-------------|---------|
| 100 | 5% | 5 | $25 |
| 500 | 3% | 15 | $75 |
| 1,000 | 2% | 20 | $100 |
| 5,000 | 1.5% | 75 | $375 |

**You only need 8 Pro subscribers to cover costs!**

---

## Quick Start Checklist

- [ ] Create Ko-fi account
- [ ] Set up $5/month "Pro" tier on Ko-fi
- [ ] Add support button to site footer
- [ ] Add "Pro" badge component
- [ ] Track executions per user (optional)
- [ ] Show upgrade prompt at 80% of limit (optional)
- [ ] Add `/pro` page explaining benefits

---

## Sample Pro Page

Create `/app/pro/page.tsx`:

```tsx
export default function ProPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">CodeComp Pro</h1>
        <p className="text-gray-400 mb-8">
          Support the platform and unlock premium features
        </p>
        
        <div className="bg-gray-900 rounded-xl p-8 mb-8">
          <div className="text-5xl font-bold mb-2">$5<span className="text-xl text-gray-400">/month</span></div>
          <p className="text-gray-400 mb-6">Cancel anytime</p>
          
          <ul className="text-left space-y-3 mb-8">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Unlimited code executions
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> All 7 programming languages
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Private competitions
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Unlimited execution history
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Pro badge on profile
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Early access to features
            </li>
          </ul>
          
          <a 
            href="https://ko-fi.com/yourusername"
            className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Subscribe on Ko-fi
          </a>
        </div>
        
        <p className="text-gray-500 text-sm">
          Your support keeps CodeComp running and ad-free for everyone.
          <br />All core features remain free forever.
        </p>
      </div>
    </div>
  );
}
```

---

## Summary

**Easiest path to $35/month:**
1. Ko-fi with $5/month Pro tier
2. 8 subscribers = break even
3. Zero code changes needed initially

**Non-aggressive approach:**
- Core features stay free forever
- Pro is purely optional enhancements
- No paywalls, no nag screens
- Simple "Support" button in footer

You can implement the Ko-fi approach in 30 minutes and start collecting supporters today!
