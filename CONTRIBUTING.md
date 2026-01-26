# Contributing to CodeComp

Thank you for considering contributing to CodeComp! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/codecomp.git
   cd codecomp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```
5. **Run development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
codecomp/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── competitions/      # Competition pages
│   ├── dashboard/         # User dashboard
│   ├── docs/             # Documentation
│   └── (auth)/           # Auth pages (login, register)
├── components/            # Reusable React components
│   └── ui/               # UI components
├── lib/                  # Utility functions and configs
│   ├── auth.ts          # BetterAuth configuration
│   └── supabase.ts      # Supabase client
└── public/              # Static assets
```

## Code Style

We use ESLint and TypeScript for code quality:

- **TypeScript**: All new code should be TypeScript
- **React**: Use functional components with hooks
- **Naming**: Use camelCase for variables, PascalCase for components
- **Comments**: Add comments for complex logic
- **Formatting**: Consistent indentation (2 spaces)

## Making Changes

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style

3. **Test your changes**:
   ```bash
   npm run build
   # Test manually in the browser
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Pull Request Guidelines

- **Clear title**: Describe what the PR does
- **Description**: Explain the changes and why they're needed
- **Screenshots**: Include for UI changes
- **Testing**: Describe how you tested the changes
- **Breaking changes**: Clearly mark if any

## Areas for Contribution

### High Priority

- **Real Code Execution**: Integrate Judge0 or Piston
- **Authentication**: Improve auth flow and error handling
- **Testing**: Add unit and integration tests
- **Performance**: Optimize database queries
- **Security**: Enhance security measures

### Medium Priority

- **UI/UX**: Improve design and user experience
- **Features**: Add new competition types
- **Documentation**: Expand guides and tutorials
- **Mobile**: Improve mobile responsiveness
- **Accessibility**: Add ARIA labels and keyboard navigation

### Good First Issues

- **Bug fixes**: Fix small bugs
- **UI improvements**: Polish existing pages
- **Documentation**: Improve README and guides
- **Examples**: Add example competitions
- **Translations**: Add internationalization

## Code Execution Integration

If you're working on code execution:

1. **Security first**: All execution must be sandboxed
2. **Resource limits**: Set time and memory limits
3. **Language support**: Document supported languages
4. **Error handling**: Provide clear error messages
5. **Testing**: Test with edge cases

## Database Changes

For database schema changes:

1. Update `supabase-schema.sql`
2. Update TypeScript types in `lib/supabase.ts`
3. Test migrations on a test database
4. Document the changes

## API Routes

When adding/modifying API routes:

1. Follow RESTful conventions
2. Add input validation
3. Handle errors properly
4. Add TypeScript types
5. Document endpoints

## Component Guidelines

For React components:

1. **Single responsibility**: One component, one purpose
2. **Props**: Use TypeScript interfaces for props
3. **Hooks**: Use custom hooks for complex logic
4. **Accessibility**: Add proper ARIA attributes
5. **Responsive**: Ensure mobile compatibility

## Testing

While we don't have automated tests yet, manual testing should cover:

- [ ] All pages load without errors
- [ ] Forms validate input correctly
- [ ] API routes return expected responses
- [ ] Error states display properly
- [ ] Mobile layout works correctly
- [ ] Dark mode displays correctly

## Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: add leaderboard filtering by language
fix: correct submission timestamp display
docs: update deployment guide
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

Thank you for contributing to CodeComp! 🎉
