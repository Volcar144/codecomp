# CodeComp Cost Optimization Guide

This guide helps you run CodeComp affordably, from free-tier options to production scaling.

## 💰 Cost Summary by Tier

| Tier | Monthly Cost | Users Supported | Best For |
|------|--------------|-----------------|----------|
| **Free** | $0 | ~100 | Learning, demos, small groups |
| **Hobby** | $20-45 | ~1,000 | Side projects, small competitions |
| **Starter** | $50-100 | ~5,000 | Growing communities |
| **Production** | $150-300+ | 10,000+ | Serious platforms |

---

## 🆓 Free Tier Strategy (Best for Starting)

### Hosting: Vercel (Free)
- **Cost**: $0
- **Limits**: 100GB bandwidth, serverless functions
- **Sufficient for**: ~100 daily active users
- **Setup**: `vercel deploy`

### Database: Supabase (Free)
- **Cost**: $0
- **Limits**: 
  - 500MB database storage
  - 2GB bandwidth
  - 50,000 monthly active users
  - 500MB file storage
- **Sufficient for**: Small competitions, ~1000 users total

### Code Execution: Public Piston API
- **Cost**: $0
- **Limits**: 
  - Rate limited (varies)
  - 15-second timeout
  - Shared resources
- **URL**: `https://emkc.org/api/v2/piston` (default)
- **Caveat**: Unreliable for production, may have downtime

### Email: Free Options
| Service | Free Tier |
|---------|-----------|
| Resend | 100 emails/day |
| SendGrid | 100 emails/day |
| Mailgun | 5,000/month (first 3 months) |
| Gmail SMTP | 500/day (not recommended) |

**Recommended**: Resend - easiest setup, generous limits

### Total Free Tier: $0/month
- ✅ Full functionality
- ⚠️ Rate limits on code execution
- ⚠️ Database size constraints
- ✅ Perfect for learning/demos

---

## 🎯 Hobby Tier ($20-45/month)

### Option A: Minimal Paid Stack

#### Vercel Pro ($20/month)
- 1TB bandwidth
- No cold starts
- Better analytics
- Concurrent builds

#### Supabase Free (stay free)
- Still sufficient for most hobby projects

#### Self-Hosted Piston ($5-15/month)
Use a cheap VPS:

| Provider | Price | Specs |
|----------|-------|-------|
| **Hetzner** | €3.79/mo (~$4) | 2GB RAM, 20GB |
| **DigitalOcean** | $6/mo | 1GB RAM, 25GB |
| **Vultr** | $5/mo | 1GB RAM, 25GB |
| **Railway** | $5/mo | Usage-based |

**Setup on VPS:**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Run Piston
docker run -d --name piston \
  -p 2000:2000 \
  -v piston_packages:/piston/packages \
  --restart unless-stopped \
  ghcr.io/engineer-man/piston

# Install languages
docker exec piston ppman install python
docker exec piston ppman install javascript-node
docker exec piston ppman install java
docker exec piston ppman install cpp
docker exec piston ppman install go
docker exec piston ppman install rust
```

Set `CODE_EXECUTION_API_URL=http://your-vps-ip:2000/api/v2`

**Total: ~$25-40/month**

### Option B: Railway All-in-One

Railway offers simple deployment:
- **Piston container**: ~$5-10/month
- **PostgreSQL**: ~$5-10/month (can use Supabase free instead)
- **Next.js app**: ~$5-10/month

**Total: ~$15-30/month**

---

## 🚀 Starter Tier ($50-100/month)

For growing platforms with ~5,000 users:

### Supabase Pro ($25/month)
- 8GB database
- 250GB bandwidth
- Daily backups
- Email support

### Vercel Pro ($20/month)
Already covered above

### Dedicated Piston Server ($15-30/month)
- 4GB RAM VPS (Hetzner CX21: €7.49/mo)
- Or DigitalOcean: $24/mo for 4GB
- Handles concurrent executions better

### Redis: Upstash ($10/month)
- Rate limiting
- Session caching
- Leaderboard caching

**Total: ~$70-85/month**

---

## 🏢 Production Tier ($150-300+/month)

For serious platforms with 10,000+ users:

### Supabase Pro+ ($75-150/month)
- Larger database
- More compute
- Better support

### Vercel Team ($150/month)
- Team features
- Higher limits
- Better support

### Piston Cluster ($50-100/month)
- Multiple VPS instances behind load balancer
- Or Kubernetes deployment
- High availability

### Redis Managed ($20-50/month)
- Upstash Pro or Redis Cloud

**Total: ~$295-450/month**

---

## 📊 Cost Comparison Table

| Service | Free | Hobby | Starter | Production |
|---------|------|-------|---------|------------|
| **Vercel** | $0 | $20 | $20 | $150 |
| **Supabase** | $0 | $0 | $25 | $75-150 |
| **Piston** | $0* | $5-15 | $15-30 | $50-100 |
| **Redis** | $0** | $0** | $10 | $20-50 |
| **Email** | $0 | $0 | $0-20 | $20-50 |
| **TOTAL** | **$0** | **$25-35** | **$70-105** | **$315-500** |

*Public API with rate limits  
**Upstash free tier

---

## 💡 Cost Optimization Tips

### 1. Optimize Code Execution Costs

```typescript
// Rate limit execution in middleware
const RATE_LIMITS = {
  free: 10,      // 10 executions/hour
  pro: 100,      // 100 executions/hour
  unlimited: -1
};
```

### 2. Cache Aggressively

```typescript
// Cache leaderboards (change infrequently)
// Cache user profiles
// Cache competition metadata
```

### 3. Limit Execution Time

```typescript
// In lib/code-execution.ts
const MAX_TIMEOUT = {
  free: 5,     // 5 seconds
  pro: 15,     // 15 seconds
  premium: 30  // 30 seconds
};
```

### 4. Use Edge Functions

Deploy on Vercel Edge for lower latency and costs:
```typescript
export const runtime = 'edge';
```

### 5. Database Optimization

- Add indexes to frequently queried columns
- Use materialized views for leaderboards
- Archive old submissions

```sql
-- Archive submissions older than 6 months
CREATE TABLE submissions_archive AS 
SELECT * FROM submissions 
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM submissions 
WHERE created_at < NOW() - INTERVAL '6 months';
```

### 6. Implement Tiered Features

| Feature | Free | Pro ($5/mo) |
|---------|------|-------------|
| Daily executions | 20 | Unlimited |
| Languages | 3 | All 7 |
| Private competitions | ❌ | ✅ |
| Custom test cases | 5 | 50 |
| Code history | 7 days | Forever |

---

## 🔧 Self-Hosting Everything (Cheapest)

For maximum cost savings, self-host on a single VPS:

### Hetzner CX31 (~$12/month)
- 4 vCPU, 8GB RAM, 80GB SSD

**Setup:**
```bash
# Install everything
apt update && apt install -y docker.io docker-compose nginx certbot

# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      
  piston:
    image: ghcr.io/engineer-man/piston
    ports:
      - "2000:2000"
    volumes:
      - piston_packages:/piston/packages
      
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  piston_packages:
  pgdata:
  redis_data:
```

**Total: ~$12/month** for complete self-hosted solution

⚠️ **Trade-offs:**
- You handle backups
- You handle security updates
- You handle monitoring
- Single point of failure

---

## 📈 Scaling Strategy

### Start Free → Grow with Revenue

1. **Month 1-3**: Free tier, validate idea
2. **Month 4-6**: Add Piston VPS ($10/mo) when you hit rate limits
3. **Month 7-12**: Move to Supabase Pro ($25/mo) when DB fills
4. **Year 2+**: Add revenue features, scale infrastructure

### Revenue Ideas to Offset Costs

| Feature | Price | Margin |
|---------|-------|--------|
| Pro subscription | $5/mo | High |
| Competition hosting | $10-50 | Medium |
| Team/enterprise | $20/user/mo | High |
| Premium templates | $2-5 | High |
| Certification exams | $10-20 | Medium |

**Break-even:** 10-20 Pro subscribers cover Starter tier costs

---

## 🎓 Educational/Non-Profit Discounts

### Vercel
- Free for open source
- Educational discounts available

### Supabase
- Free tier is generous
- Contact for educational pricing

### Cloud Providers
- AWS Educate: Free credits
- Azure for Students: $100 credits
- Google Cloud: $300 free credits
- GitHub Student Pack: Various credits

---

## Quick Start Recommendation

**For learning/demos:**
- Use all free tiers
- Accept rate limits on code execution

**For small communities (<500 users):**
- Vercel Free
- Supabase Free
- Self-hosted Piston on $5 VPS
- **Total: $5/month**

**For growing platforms:**
- Vercel Pro ($20)
- Supabase Pro ($25)  
- Piston on 4GB VPS ($15)
- Upstash Free for Redis
- **Total: $60/month**

---

## Environment Variables Summary

```env
# Free tier
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=postgresql://xxx
BETTER_AUTH_SECRET=xxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Self-hosted Piston (optional, saves rate limits)
CODE_EXECUTION_API_URL=http://your-vps:2000/api/v2

# Redis (optional, for rate limiting)
REDIS_URL=redis://xxx

# Email (optional, for verification)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```

---

## Summary

**You can run CodeComp for free** using:
- Vercel Free (hosting)
- Supabase Free (database)
- Public Piston API (code execution)
- Resend Free (email)

**For reliable code execution**, add a $5-15/month VPS running Piston.

**For production**, expect $60-150/month depending on scale.

The platform is designed to scale cost-effectively from zero to production!
