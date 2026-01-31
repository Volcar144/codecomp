import { betterAuth } from "better-auth";
import { stripe } from "@better-auth/stripe";
import { organization } from "better-auth/plugins";
import Stripe from "stripe";
import { 
  sendPasswordResetEmail, 
  sendVerificationEmail,
  sendTrialStartedEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
  sendOrganizationInvitationEmail,
} from "./email";
import { supabase } from "./supabase";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/codecomp';

// Initialize Stripe client
const stripeClient = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Helper to get plan display name
const getPlanDisplayName = (planName: string): string => {
  const names: Record<string, string> = {
    pro: 'Pro',
    family: 'Family',
    team: 'Team',
  };
  return names[planName] || planName;
};

// Helper to get user by subscription reference ID
// Uses Supabase to query the user table
const getUserEmailFromSubscription = async (
  referenceId: string
): Promise<{ email: string; name: string } | null> => {
  try {
    // Query the user table using Supabase
    const { data, error } = await supabase
      .from('user')
      .select('email, name')
      .eq('id', referenceId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user for email:', error);
      return null;
    }
    
    return { 
      email: data.email, 
      name: data.name || 'there' 
    };
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
};

export const auth = betterAuth({ database: new Pool({ 
        connectionString: process.env.DATABASE_URL 
    }),
  
  emailAndPassword: {
    enabled: true,
    // Password reset configuration
    sendResetPassword: async ({ user, url }, request) => {
      // Send password reset email using nodemailer
      // Falls back to console logging if SMTP is not configured
      await sendPasswordResetEmail(user.email, url);
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
    // Email verification configuration
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    sendVerificationEmail: async ({ user, url }: { user: { email: string }, url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },
  plugins: stripeClient ? [
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          // Individual Pro Plan
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
            annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly",
            freeTrial: {
              days: 7,
              onTrialStart: async (subscription) => {
                console.log(`Trial started for subscription ${subscription.id}`);
                const user = await getUserEmailFromSubscription(subscription.referenceId);
                if (user) {
                  await sendTrialStartedEmail(user.email, {
                    userName: user.name,
                    planName: 'pro',
                    planDisplayName: 'Pro',
                    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    amount: 5,
                  });
                }
              },
              onTrialEnd: async ({ subscription }) => {
                console.log(`Trial ended for subscription ${subscription.id}`);
                // Trial ended - if not canceled, subscription will convert to paid
                // The onSubscriptionComplete callback will handle the welcome email
              },
            },
            limits: {
              dailyExecutions: Infinity,
              executionTimeout: 30,
              historyDays: 90,
              privateCompetitions: true,
              priorityQueue: true,
            },
          },
          // Family Plan (3 seats included)
          {
            name: "family",
            priceId: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID || "price_family_monthly",
            annualDiscountPriceId: process.env.STRIPE_FAMILY_YEARLY_PRICE_ID || "price_family_yearly",
            freeTrial: {
              days: 7,
              onTrialStart: async (subscription) => {
                console.log(`Family trial started for subscription ${subscription.id}`);
                const user = await getUserEmailFromSubscription(subscription.referenceId);
                if (user) {
                  await sendTrialStartedEmail(user.email, {
                    userName: user.name,
                    planName: 'family',
                    planDisplayName: 'Family',
                    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    amount: 12,
                    seats: 3,
                  });
                }
              },
              onTrialEnd: async ({ subscription }) => {
                console.log(`Family trial ended for subscription ${subscription.id}`);
              },
            },
            limits: {
              seats: 3,
              dailyExecutions: Infinity,
              executionTimeout: 30,
              historyDays: 90,
              privateCompetitions: true,
              priorityQueue: true,
            },
          },
          // Team/Organization Plan (5 seats included, per-seat after)
          {
            name: "team",
            priceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "price_team_monthly",
            annualDiscountPriceId: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || "price_team_yearly",
            freeTrial: {
              days: 7,
              onTrialStart: async (subscription) => {
                console.log(`Team trial started for subscription ${subscription.id}`);
                const user = await getUserEmailFromSubscription(subscription.referenceId);
                if (user) {
                  await sendTrialStartedEmail(user.email, {
                    userName: user.name,
                    planName: 'team',
                    planDisplayName: 'Team',
                    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    amount: 25,
                    seats: 5,
                  });
                }
              },
              onTrialEnd: async ({ subscription }) => {
                console.log(`Team trial ended for subscription ${subscription.id}`);
              },
            },
            limits: {
              freeSeats: 5,
              dailyExecutions: Infinity,
              executionTimeout: 30,
              historyDays: 90,
              privateCompetitions: true,
              priorityQueue: true,
            },
          },
        ],
        authorizeReference: async ({ user, referenceId, action }) => {
          // For user subscriptions, the referenceId is the user's ID
          if (referenceId === user.id) {
            return true;
          }
          // For organization subscriptions, check if user is admin/owner
          // This will be handled by organization plugin integration
          return true;
        },
        onSubscriptionComplete: async ({ subscription, plan }) => {
          console.log(`Subscription ${subscription.id} completed for plan ${plan.name}`);
          const user = await getUserEmailFromSubscription(subscription.referenceId);
          if (user) {
            // Get plan-specific pricing
            const pricing: Record<string, number> = {
              pro: 5,
              family: 12,
              team: 25,
            };
            await sendSubscriptionActivatedEmail(user.email, {
              userName: user.name,
              planName: plan.name,
              planDisplayName: getPlanDisplayName(plan.name),
              amount: pricing[plan.name] || 5,
              seats: plan.name === 'family' ? 3 : plan.name === 'team' ? 5 : undefined,
            });
          }
        },
        onSubscriptionCancel: async ({ subscription }) => {
          console.log(`Subscription ${subscription.id} canceled`);
          const user = await getUserEmailFromSubscription(subscription.referenceId);
          if (user && stripeClient && subscription.stripeSubscriptionId) {
            // Fetch the subscription from Stripe to get period end date
            try {
              const stripeSubscription = await stripeClient.subscriptions.retrieve(
                subscription.stripeSubscriptionId as string
              );
              
              // Access current_period_end from the response data
              const subscriptionData = stripeSubscription as unknown as { current_period_end?: number };
              const periodEnd = subscriptionData.current_period_end 
                ? new Date(subscriptionData.current_period_end * 1000)
                : new Date();
              
              await sendSubscriptionCanceledEmail(user.email, {
                userName: user.name,
                planName: subscription.plan || 'pro',
                planDisplayName: getPlanDisplayName(subscription.plan || 'pro'),
                periodEndDate: periodEnd,
              });
            } catch (error) {
              console.error('Error fetching Stripe subscription for cancel email:', error);
              // Send email without period end date
              await sendSubscriptionCanceledEmail(user.email, {
                userName: user.name,
                planName: subscription.plan || 'pro',
                planDisplayName: getPlanDisplayName(subscription.plan || 'pro'),
              });
            }
          } else if (user) {
            // Send without period end if we can't get Stripe data
            await sendSubscriptionCanceledEmail(user.email, {
              userName: user.name,
              planName: subscription.plan || 'pro',
              planDisplayName: getPlanDisplayName(subscription.plan || 'pro'),
            });
          }
        },
      },
      // Enable organization subscriptions in Stripe
      organization: {
        enabled: true,
      },
    }),
    // BetterAuth Organization Plugin for team/family management
    organization({
      // Allow any user to create an organization (Family or Team)
      allowUserToCreateOrganization: true,
      
      // Invitation email configuration
      sendInvitationEmail: async ({ invitation, inviter, organization }) => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const invitationLink = `${appUrl}/invite/accept?id=${invitation.id}`;
        
        await sendOrganizationInvitationEmail(invitation.email, {
          inviterName: inviter.user.name || inviter.user.email,
          organizationName: organization.name,
          role: invitation.role,
          invitationLink,
        });
      },
      
      // Teams feature for Team plan organizations
      teams: {
        enabled: true,
        maximumTeams: 10, // Max 10 teams per organization
      },
      
      // Default roles: owner, admin, member are built-in
      // Organization deletion settings
      organizationDeletion: {
        disabled: false,
      },
    }),
  ] : [
    // Organization plugin even without Stripe (for development)
    organization({
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async ({ invitation, inviter, organization }) => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const invitationLink = `${appUrl}/invite/accept?id=${invitation.id}`;
        
        await sendOrganizationInvitationEmail(invitation.email, {
          inviterName: inviter.user.name || inviter.user.email,
          organizationName: organization.name,
          role: invitation.role,
          invitationLink,
        });
      },
      teams: {
        enabled: true,
        maximumTeams: 10,
      },
      // Default roles: owner, admin, member are built-in
      organizationDeletion: {
        disabled: false,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
