# CodeComp - Coding Competition Platform

A full-featured coding competition platform built with Next.js 14+, BetterAuth, and Supabase.

## Features

- 🏆 **Competition Management**: Create and manage coding competitions with custom rules, test cases, and prizes
- 💻 **Multi-Language Support**: Write code in Python, JavaScript, Java, C++, and more
- ⚡ **Real-time Code Execution**: Test your code with instant feedback before submission
- 🎯 **Automated Testing**: Run code against test cases with automated scoring
- 📊 **Leaderboards & Rankings**: Track performance and compete for top positions
- 👥 **Judge Management**: Assign judges to review and manage competitions
- 🎁 **Prize System**: Define prizes for top performers
- 🔐 **Authentication**: Secure user authentication with BetterAuth

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, TailwindCSS
- **Authentication**: BetterAuth
- **Database**: Supabase (PostgreSQL)
- **Code Editor**: Monaco Editor (VS Code's editor)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Volcar144/codecomp.git
cd codecomp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@host:port/database
```

4. Set up the database:

Run the SQL schema in your Supabase project:
```bash
# Copy the contents of supabase-schema.sql and run it in Supabase SQL Editor
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
codecomp/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── competitions/ # Competition CRUD
│   │   ├── execute/      # Code execution
│   │   └── submissions/  # Submission handling
│   ├── competitions/     # Competition pages
│   │   ├── create/       # Create competition
│   │   └── [id]/         # Competition details & submit
│   ├── dashboard/        # User dashboard
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── layout.tsx        # Root layout
├── components/           # Reusable components
├── lib/
│   ├── auth.ts          # BetterAuth configuration
│   └── supabase.ts      # Supabase client
├── supabase-schema.sql  # Database schema
└── package.json
```

## Database Schema

The application uses the following main tables:

- **competitions**: Store competition details, rules, and settings
- **submissions**: Track user code submissions
- **test_cases**: Define test cases for competitions
- **test_results**: Store execution results for submissions
- **judges**: Manage competition judges
- **prizes**: Define competition prizes
- **leaderboard**: View for rankings (auto-generated)

## Code Execution

The current implementation uses mock code execution for demonstration purposes. For production, you should integrate with a sandboxed execution environment such as:

- [Judge0](https://judge0.com/) - Online code execution API
- [Piston](https://github.com/engineer-man/piston) - High-performance code execution engine
- Custom Docker-based solution

To integrate a real execution engine, modify `/app/api/execute/route.ts`.

## Features Implementation Status

- ✅ User Authentication (BetterAuth with email/password)
- ✅ Competition Creation & Management
- ✅ Code Editor (Monaco - VS Code's editor)
- ✅ Multi-language Support (Python, JavaScript, Java, C++, C#, Go, Rust)
- ✅ Test Case Management (via database)
- ✅ Submission System
- ✅ Leaderboard with Podium Display
- ✅ Prize Management (database schema)
- ✅ Judge Assignment (database schema)
- ✅ User Dashboard
- ✅ Documentation Page
- ⚠️ Code Execution (Mock - needs production implementation)
- 🔄 Redis/Cron Integration (Optional - for caching and scheduled tasks)

## Screenshots

### Homepage
Beautiful landing page with feature highlights and call-to-action buttons.

### Code Editor
Monaco editor with syntax highlighting, multi-language support, and test execution.

### Leaderboard
Interactive leaderboard with podium display for top 3 and detailed rankings table.

### Competition Management
Easy-to-use forms for creating competitions with custom rules and settings.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Volcar144/codecomp)

1. Click the button above
2. Set environment variables (see DEPLOYMENT.md)
3. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- AWS Amplify
- Netlify
- Railway
- Render
- Docker

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Support

For issues and questions, please open a GitHub issue.

## Roadmap

- [ ] Real-time code execution with Judge0/Piston
- [ ] WebSocket support for live competitions
- [ ] Team competitions
- [ ] Code review features for judges
- [ ] Discussion forums per competition
- [ ] Email notifications
- [ ] Advanced analytics and insights
- [ ] Mobile apps (React Native)
- [ ] AI-powered code suggestions
- [ ] Contest templates library

## License

ISC

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Authentication by [BetterAuth](https://www.better-auth.com/)
- Database by [Supabase](https://supabase.com/)
- Code editor by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Icons by [Lucide](https://lucide.dev/)
