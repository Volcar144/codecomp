import { betterAuth } from "better-auth";

const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/codecomp';

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: databaseUrl,
  },
  emailAndPassword: {
    enabled: true,
    // Password reset configuration
    // In production, implement sendResetPassword to send actual emails
    // For now, log the reset URL (replace with actual email service)
    sendResetPassword: async ({ user, url, token }, request) => {
      // TODO: Replace with your email service (e.g., Resend, SendGrid, etc.)
      // Example with a hypothetical email service:
      // await sendEmail({
      //   to: user.email,
      //   subject: "Reset your password",
      //   text: `Click the link to reset your password: ${url}`,
      // });
      
      // For development, log the reset URL
      console.log(`[DEV] Password reset requested for ${user.email}`);
      console.log(`[DEV] Reset URL: ${url}`);
      console.log(`[DEV] Token: ${token}`);
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
