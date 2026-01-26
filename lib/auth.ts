import { betterAuth } from "better-auth";

const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/codecomp';

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: databaseUrl,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },
});

export type Session = typeof auth.$Infer.Session;
