import { betterAuth } from "better-auth";
import { sendPasswordResetEmail } from "./email";

const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/codecomp';

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: databaseUrl,
  },
  emailAndPassword: {
    enabled: true,
    // Password reset configuration
    sendResetPassword: async ({ user, url }, request) => {
      // Send password reset email using Resend
      // Falls back to console logging if RESEND_API_KEY is not configured
      await sendPasswordResetEmail(user.email, url);
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
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
