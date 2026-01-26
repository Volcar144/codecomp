# CodeComp Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │  API Routes  │      │
│  │              │  │              │  │              │      │
│  │ - Home       │  │ - Loading    │  │ - Auth       │      │
│  │ - Login      │  │ - Error      │  │ - Compete.   │      │
│  │ - Register   │  │ - Editor     │  │ - Execute    │      │
│  │ - Compete.   │  │              │  │ - Submit     │      │
│  │ - Dashboard  │  │              │  │ - Leader.    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                       │
│                      (BetterAuth)                           │
├─────────────────────────────────────────────────────────────┤
│  • Email/Password Authentication                            │
│  • GitHub OAuth (optional)                                  │
│  • Session Management                                       │
│  • Protected Routes                                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (Supabase)                 │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                    │
│  • users (managed by BetterAuth)                            │
│  • competitions                                             │
│  • submissions                                              │
│  • test_cases                                               │
│  • test_results                                             │
│  • judges                                                   │
│  • prizes                                                   │
│                                                             │
│  Views:                                                     │
│  • leaderboard (rankings)                                   │
│                                                             │
│  Security:                                                  │
│  • Row Level Security (RLS) policies                        │
│  • Indexes for performance                                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              Code Execution Layer (External)                │
├─────────────────────────────────────────────────────────────┤
│  Options:                                                   │
│  • Judge0 API (recommended)                                 │
│  • Piston Engine                                            │
│  • Custom Docker Solution                                   │
│                                                             │
│  Current: Mock Implementation (for development)             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              Optional Services (Future)                     │
├─────────────────────────────────────────────────────────────┤
│  • Redis (caching, rate limiting)                           │
│  • Cron.serverless (scheduled tasks)                        │
│  • Email Service (notifications)                            │
│  • CDN (static assets)                                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Registration/Login
```
User → Login Page → BetterAuth API → Database → Session Cookie → Dashboard
```

### 2. Creating a Competition
```
User → Create Form → API Route → Validation → Database → Competition Page
```

### 3. Code Submission Flow
```
User → Code Editor → Run Tests → Execute API → Mock Execution → Results
                   ↓
               Submit Code → Submissions API → Database → Leaderboard Update
```

### 4. Leaderboard Update
```
New Submission → Database Trigger → Leaderboard View Update → API Response → UI Update
```

## Directory Structure Explained

```
codecomp/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── auth/[...all]/       # BetterAuth endpoints
│   │   ├── competitions/        # Competition CRUD
│   │   ├── execute/             # Code execution
│   │   ├── leaderboard/         # Rankings data
│   │   └── submissions/         # Submission handling
│   │
│   ├── competitions/             # Competition Pages
│   │   ├── [id]/                # Dynamic route for competition
│   │   │   ├── page.tsx         # Competition details
│   │   │   ├── leaderboard/     # Leaderboard page
│   │   │   └── submit/          # Code editor page
│   │   ├── create/              # Create competition
│   │   └── page.tsx             # Competition listing
│   │
│   ├── dashboard/               # User dashboard
│   ├── docs/                    # Documentation page
│   ├── login/                   # Login page
│   ├── register/                # Registration page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
│
├── components/                  # Reusable Components
│   └── ui/                      # UI Components
│       ├── ErrorMessage.tsx     # Error display
│       └── Loading.tsx          # Loading states
│
├── lib/                         # Utilities & Config
│   ├── auth.ts                  # BetterAuth config
│   └── supabase.ts              # Supabase client & types
│
├── public/                      # Static assets
│
├── .env.example                 # Environment template
├── CONTRIBUTING.md              # Contribution guide
├── DEPLOYMENT.md                # Deployment instructions
├── README.md                    # Project overview
├── supabase-schema.sql          # Database schema
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

## Technology Choices

### Why Next.js App Router?
- Server Components for better performance
- Built-in API routes
- File-based routing
- Excellent SEO support
- Edge runtime support

### Why BetterAuth?
- Modern authentication solution
- Multiple providers support
- TypeScript-first
- Easy database integration
- Session management built-in

### Why Supabase?
- PostgreSQL database (reliable, scalable)
- Row Level Security (RLS)
- Real-time subscriptions
- Built-in authentication
- RESTful API auto-generated
- Open source

### Why Monaco Editor?
- Industry-standard (VS Code)
- Syntax highlighting
- IntelliSense support
- Multi-language support
- Customizable themes
- Keyboard shortcuts

### Why Tailwind CSS?
- Utility-first approach
- Fast development
- Consistent design
- Dark mode support
- Responsive by default
- Small production bundle

## Security Measures

### Current Implementation

1. **Environment Variables**: Sensitive data in .env files
2. **Row Level Security**: Database-level access control
3. **Input Validation**: Forms validate user input
4. **TypeScript**: Type safety prevents many bugs
5. **HTTPS Only**: Enforced in production
6. **Session Security**: Secure cookies with BetterAuth

### Production Additions Needed

1. **Code Execution Sandboxing**: Isolated containers
2. **Rate Limiting**: Prevent API abuse
3. **CSRF Protection**: For state-changing operations
4. **Content Security Policy**: Prevent XSS attacks
5. **SQL Injection Prevention**: Parameterized queries (already done)
6. **Secrets Rotation**: Regular key updates

## Performance Optimizations

### Current

- Static page generation where possible
- Code splitting (automatic with Next.js)
- Image optimization (Next.js Image component ready)
- CSS purging (Tailwind)
- Compressed assets

### Future Improvements

- Redis caching for leaderboards
- CDN for static assets
- Database query optimization
- Connection pooling
- Edge functions for auth
- Lazy loading components

## Scalability Considerations

### Vertical Scaling (Single Server)
- Optimize database queries
- Add database indexes
- Enable connection pooling
- Use caching strategically

### Horizontal Scaling (Multiple Servers)
- Stateless API design (already implemented)
- Session storage in database
- Load balancer for web servers
- Separate execution servers
- Queue system for submissions

## Development Workflow

```
1. Feature Branch → Code Changes → Local Testing
                ↓
2. Pull Request → Code Review → CI Checks
                ↓
3. Merge to Main → Auto Deploy → Production
                ↓
4. Monitor → Feedback → Iterate
```

## Future Enhancements

### High Priority
- Real code execution integration
- Automated testing suite
- Performance monitoring
- Error tracking (Sentry)

### Medium Priority
- WebSocket for live updates
- Email notifications
- Team competitions
- Advanced analytics

### Nice to Have
- Mobile apps
- Code review features
- AI-powered hints
- Video tutorials
- Contest templates

## FAQ

**Q: Can I use this for production?**
A: Yes, after setting up the database and integrating a code execution service.

**Q: How do I add new programming languages?**
A: Add to the LANGUAGES array in create competition page and update the execution engine.

**Q: Is the code execution secure?**
A: The mock implementation is safe. Production needs sandboxed execution (Judge0/Piston).

**Q: Can I self-host everything?**
A: Yes, you can self-host the app, database, and execution engine.

**Q: How much does it cost to run?**
A: Supabase free tier + Vercel free tier = $0 for small scale. Execution service costs vary.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [BetterAuth Documentation](https://www.better-auth.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Judge0 Documentation](https://ce.judge0.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

For more details, see individual documentation files.
