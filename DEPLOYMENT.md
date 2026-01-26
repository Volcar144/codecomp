# Deployment Guide

## Prerequisites

Before deploying CodeComp, ensure you have:

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js 18+**: For local development
3. **Deployment Platform**: Vercel (recommended), Netlify, or any Node.js hosting

## Step 1: Set Up Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor in your Supabase dashboard
3. Copy the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables and views

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# BetterAuth Configuration
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
BETTER_AUTH_URL=https://your-domain.com

# Database URL (PostgreSQL connection string from Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# Optional: GitHub OAuth (for social login)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional: Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# Optional: Code Execution API
CODE_EXECUTION_API_URL=https://your-judge0-instance.com
```

### Getting Supabase Credentials

1. Go to your Supabase project settings
2. Navigate to "API" section
3. Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the service_role key → `SUPABASE_SERVICE_ROLE_KEY`
6. Navigate to "Database" section
7. Copy the Connection string (URI) → `DATABASE_URL`

### Generating BetterAuth Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Deploy to Vercel

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add BETTER_AUTH_SECRET
vercel env add BETTER_AUTH_URL
vercel env add DATABASE_URL

# Deploy to production
vercel --prod
```

### Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Add all environment variables in project settings
5. Deploy!

## Step 4: Set Up Code Execution (Production)

The current implementation uses mock code execution. For production, integrate with:

### Option 1: Judge0 (Recommended)

1. Sign up for Judge0 CE or deploy your own instance
2. Add Judge0 API URL to `CODE_EXECUTION_API_URL`
3. Update `/app/api/execute/route.ts` to use Judge0 API

### Option 2: Piston

1. Deploy Piston: https://github.com/engineer-man/piston
2. Update execute route to use Piston API

### Option 3: Custom Docker Solution

1. Set up isolated Docker containers
2. Implement sandboxed execution
3. Add resource limits and security measures

## Step 5: Configure GitHub OAuth (Optional)

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Create a new OAuth App
3. Set Homepage URL to your domain
4. Set Authorization callback URL to: `https://your-domain.com/api/auth/callback/github`
5. Copy Client ID and Client Secret
6. Add to environment variables

## Step 6: Set Up Redis (Optional)

For caching and rate limiting:

1. Use Upstash (serverless Redis) or Redis Cloud
2. Get connection URL
3. Add to `REDIS_URL` environment variable
4. Implement caching in API routes

## Step 7: Post-Deployment Checklist

- [ ] Verify database connection works
- [ ] Test user registration and login
- [ ] Create a test competition
- [ ] Submit test code
- [ ] Check leaderboard updates
- [ ] Test all pages load correctly
- [ ] Verify authentication redirects work
- [ ] Test code editor functionality
- [ ] Monitor error logs

## Security Considerations

1. **Never commit `.env.local`** - Use `.env.example` as template
2. **Rotate secrets regularly** - Especially BETTER_AUTH_SECRET
3. **Enable RLS policies** - Supabase Row Level Security is crucial
4. **Use service role key carefully** - Only in server-side code
5. **Implement rate limiting** - Prevent abuse of code execution
6. **Validate all inputs** - Sanitize user-provided code and data
7. **Monitor usage** - Set up alerts for unusual activity

## Production Code Execution Security

When integrating real code execution:

1. **Sandbox all execution** - Use Docker containers or VMs
2. **Set time limits** - Prevent infinite loops (2-5 seconds)
3. **Set memory limits** - Prevent memory exhaustion (256-512 MB)
4. **Disable network access** - No external API calls
5. **Disable file system** - Or use read-only file system
6. **Use separate execution servers** - Don't run on main app servers
7. **Implement queue system** - Handle execution requests asynchronously

## Monitoring and Maintenance

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Vercel Analytics or Google Analytics
- **Uptime Monitoring**: UptimeRobot
- **Performance**: Lighthouse CI

### Regular Maintenance

- Monitor database size and performance
- Review and optimize slow queries
- Update dependencies regularly
- Backup database regularly
- Review security logs

## Troubleshooting

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check Supabase project is running
- Ensure IP is whitelisted (if restrictions enabled)
- Verify connection pooling settings

### Authentication Issues

- Verify BETTER_AUTH_SECRET is set
- Check BETTER_AUTH_URL matches your domain
- Ensure database tables are created
- Verify callback URLs are correct

## Scaling Considerations

As your platform grows:

1. **Database**: Use Supabase connection pooling
2. **Code Execution**: Deploy multiple execution servers
3. **Caching**: Implement Redis for leaderboards
4. **CDN**: Use Vercel Edge Network or Cloudflare
5. **Background Jobs**: Use serverless functions for heavy tasks

## Support

For issues:
- Check the documentation: `/docs` page
- Review error logs in Vercel dashboard
- Check Supabase logs for database issues
- Open GitHub issue for bugs

## License

ISC
