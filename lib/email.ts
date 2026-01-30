import nodemailer from 'nodemailer';

// Email template types
export type EmailTemplateType = 
  | 'password-reset'
  | 'competition-started'
  | 'competition-ending-soon'
  | 'competition-ended'
  | 'submission-received'
  | 'new-rank'
  | 'arena-invite';

interface CompetitionEmailData {
  competitionTitle: string;
  competitionUrl: string;
  endDate?: string;
  score?: number;
  rank?: number;
}

interface ArenaEmailData {
  arenaTitle: string;
  arenaUrl: string;
  inviteCode?: string;
}

// Create nodemailer transporter
// If SMTP configuration is not set, this will be null and emails won't be sent
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const transporter = createTransporter();

/**
 * Send password reset email
 * @param email User's email address
 * @param resetUrl Password reset URL with token
 * @returns Promise that resolves when email is sent
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  // If SMTP is not configured, log to console (development mode)
  if (!transporter) {
    console.log(`[DEV] Password reset requested for ${email}`);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
    console.log('[DEV] Note: Configure SMTP environment variables to send actual emails');
    return;
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Reset Your CodeComp Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CodeComp</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Coding Competition Platform</p>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
                
                <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
                  We received a request to reset your password for your CodeComp account. Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #6b7280; margin: 20px 0 10px 0; line-height: 1.6; font-size: 14px;">
                  Or copy and paste this URL into your browser:
                </p>
                <p style="color: #667eea; margin: 0; word-break: break-all; font-size: 14px;">
                  ${resetUrl}
                </p>
                
                <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; margin: 0; font-size: 13px; line-height: 1.6;">
                    This link will expire in 1 hour for security reasons.
                  </p>
                  <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 13px; line-height: 1.6;">
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  © ${new Date().getFullYear()} CodeComp. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Reset Your CodeComp Password

We received a request to reset your password for your CodeComp account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} CodeComp. All rights reserved.
      `.trim(),
    });

    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    // Don't throw - we don't want to expose email sending errors to users
    // for security reasons (prevent email enumeration)
  }
}

/**
 * Send verification email for new accounts
 * @param email User's email address  
 * @param verifyUrl Email verification URL with token
 * @returns Promise that resolves when email is sent
 */
export async function sendVerificationEmail(
  email: string,
  verifyUrl: string
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  // If SMTP is not configured, log to console (development mode)
  if (!transporter) {
    console.log(`[DEV] Email verification requested for ${email}`);
    console.log(`[DEV] Verify URL: ${verifyUrl}`);
    console.log('[DEV] Note: Configure SMTP environment variables to send actual emails');
    return;
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: 'Verify Your CodeComp Email',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CodeComp</h1>
                <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">Coding Competition Platform</p>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">Welcome to CodeComp! 🎉</h2>
                
                <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
                  Thanks for signing up! Please verify your email address to get started with coding competitions.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyUrl}" 
                     style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Verify Email
                  </a>
                </div>
                
                <p style="color: #6b7280; margin: 20px 0 10px 0; line-height: 1.6; font-size: 14px;">
                  Or copy and paste this URL into your browser:
                </p>
                <p style="color: #10b981; margin: 0; word-break: break-all; font-size: 14px;">
                  ${verifyUrl}
                </p>
                
                <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #9ca3af; margin: 0; font-size: 13px; line-height: 1.6;">
                    If you didn't create a CodeComp account, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  © ${new Date().getFullYear()} CodeComp. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to CodeComp!

Thanks for signing up! Please verify your email address to get started with coding competitions.

Click the link below to verify your email:
${verifyUrl}

If you didn't create a CodeComp account, you can safely ignore this email.

© ${new Date().getFullYear()} CodeComp. All rights reserved.
      `.trim(),
    });

    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}

/**
 * Generate email HTML template with consistent styling
 */
function generateEmailTemplate(title: string, content: string, ctaText?: string, ctaUrl?: string): string {
  const ctaButton = ctaText && ctaUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" 
         style="display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${ctaText}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">CodeComp</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Coding Competition Platform</p>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">${title}</h2>
            
            <div style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
              ${content}
            </div>
            
            ${ctaButton}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} CodeComp. All rights reserved.
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
              You're receiving this because you have a CodeComp account.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send competition started notification
 */
export async function sendCompetitionStartedEmail(
  email: string,
  data: CompetitionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Competition started notification for ${email}`);
    console.log(`[DEV] Competition: ${data.competitionTitle}`);
    return;
  }

  const content = `
    <p>Great news! The competition <strong>${data.competitionTitle}</strong> has started!</p>
    <p>Head over to the competition page to start solving challenges and climb the leaderboard.</p>
    ${data.endDate ? `<p>Ends: ${new Date(data.endDate).toLocaleString()}</p>` : ''}
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🚀 Competition Started: ${data.competitionTitle}`,
      html: generateEmailTemplate('Competition Started!', content, 'Join Now', data.competitionUrl),
    });
    console.log(`✅ Competition started email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send competition started email:', error);
  }
}

/**
 * Send competition ending soon notification
 */
export async function sendCompetitionEndingSoonEmail(
  email: string,
  data: CompetitionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Competition ending soon notification for ${email}`);
    console.log(`[DEV] Competition: ${data.competitionTitle}`);
    return;
  }

  const content = `
    <p>⏰ Time is running out! The competition <strong>${data.competitionTitle}</strong> is ending soon!</p>
    ${data.endDate ? `<p style="font-size: 18px; font-weight: bold; color: #dc2626;">Ends: ${new Date(data.endDate).toLocaleString()}</p>` : ''}
    <p>Make sure to submit your best solution before the deadline.</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `⏰ Ending Soon: ${data.competitionTitle}`,
      html: generateEmailTemplate('Competition Ending Soon!', content, 'Submit Now', data.competitionUrl),
    });
    console.log(`✅ Competition ending soon email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send competition ending soon email:', error);
  }
}

/**
 * Send competition ended notification with final results
 */
export async function sendCompetitionEndedEmail(
  email: string,
  data: CompetitionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Competition ended notification for ${email}`);
    console.log(`[DEV] Competition: ${data.competitionTitle}, Rank: ${data.rank}`);
    return;
  }

  const rankEmoji = data.rank === 1 ? '🥇' : data.rank === 2 ? '🥈' : data.rank === 3 ? '🥉' : '🎯';
  const content = `
    <p>The competition <strong>${data.competitionTitle}</strong> has ended!</p>
    ${data.rank ? `
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="font-size: 36px; margin: 0;">${rankEmoji}</p>
        <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">Your Final Rank: #${data.rank}</p>
        ${data.score !== undefined ? `<p style="color: #6b7280; margin: 5px 0 0 0;">Score: ${data.score} points</p>` : ''}
      </div>
    ` : ''}
    <p>Check out the final leaderboard to see how everyone performed!</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🏁 Competition Ended: ${data.competitionTitle}`,
      html: generateEmailTemplate('Competition Results', content, 'View Leaderboard', `${data.competitionUrl}/leaderboard`),
    });
    console.log(`✅ Competition ended email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send competition ended email:', error);
  }
}

/**
 * Send submission received confirmation
 */
export async function sendSubmissionReceivedEmail(
  email: string,
  data: CompetitionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Submission received notification for ${email}`);
    console.log(`[DEV] Competition: ${data.competitionTitle}, Score: ${data.score}`);
    return;
  }

  const content = `
    <p>Your submission for <strong>${data.competitionTitle}</strong> has been received and processed!</p>
    ${data.score !== undefined ? `
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0;">${data.score}</p>
        <p style="color: #6b7280; margin: 5px 0 0 0;">points</p>
      </div>
    ` : ''}
    <p>Keep improving your solution to climb the leaderboard!</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `✅ Submission Received: ${data.competitionTitle}`,
      html: generateEmailTemplate('Submission Received', content, 'View Leaderboard', `${data.competitionUrl}/leaderboard`),
    });
    console.log(`✅ Submission received email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send submission received email:', error);
  }
}

/**
 * Send arena invite notification
 */
export async function sendArenaInviteEmail(
  email: string,
  data: ArenaEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Arena invite notification for ${email}`);
    console.log(`[DEV] Arena: ${data.arenaTitle}, Code: ${data.inviteCode}`);
    return;
  }

  const content = `
    <p>You've been invited to join the coding arena <strong>${data.arenaTitle}</strong>!</p>
    ${data.inviteCode ? `
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="color: #6b7280; margin: 0 0 10px 0;">Your Invite Code:</p>
        <p style="font-size: 24px; font-family: monospace; font-weight: bold; color: #667eea; margin: 0;">${data.inviteCode}</p>
      </div>
    ` : ''}
    <p>Click the button below to join and start coding!</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🎯 You're Invited: ${data.arenaTitle}`,
      html: generateEmailTemplate('Arena Invitation', content, 'Join Arena', data.arenaUrl),
    });
    console.log(`✅ Arena invite email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send arena invite email:', error);
  }
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return transporter !== null;
}

// =============================================================================
// SUBSCRIPTION EMAIL TEMPLATES
// =============================================================================

interface SubscriptionEmailData {
  userName: string;
  planName: string;
  planDisplayName: string;
  amount?: number;
  currency?: string;
  trialEndDate?: Date;
  periodEndDate?: Date;
  seats?: number;
  billingPortalUrl?: string;
  upgradeUrl?: string;
}

/**
 * Send email when trial starts
 */
export async function sendTrialStartedEmail(
  email: string,
  data: SubscriptionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Trial started email for ${email}`);
    console.log(`[DEV] Plan: ${data.planDisplayName}, Trial ends: ${data.trialEndDate}`);
    return;
  }

  const trialEndFormatted = data.trialEndDate 
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(data.trialEndDate)
    : '7 days from now';

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>Welcome to <strong>CodeComp ${data.planDisplayName}</strong>! 🎉 Your 7-day free trial has started.</p>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold;">Your trial ends on</p>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 24px;">${trialEndFormatted}</p>
    </div>
    
    <h3 style="color: #111827;">What's included in your ${data.planDisplayName} trial:</h3>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>✅ Unlimited code executions</li>
      <li>✅ Priority execution queue (faster results)</li>
      <li>✅ 30-second execution timeout</li>
      <li>✅ Create private competitions</li>
      <li>✅ 90-day execution history</li>
      ${data.seats ? `<li>✅ ${data.seats} member seats included</li>` : ''}
    </ul>
    
    <p style="color: #6b7280; font-size: 14px;">
      Your card won't be charged during the trial. You can cancel anytime before ${trialEndFormatted} and you won't be charged.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🚀 Your CodeComp ${data.planDisplayName} trial has started!`,
      html: generateEmailTemplate(`Welcome to ${data.planDisplayName}!`, content, 'Start Coding', 'https://codecomp.dev/playground'),
    });
    console.log(`✅ Trial started email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send trial started email:', error);
  }
}

/**
 * Send email when trial is ending (3 days before)
 */
export async function sendTrialEndingEmail(
  email: string,
  data: SubscriptionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Trial ending email for ${email}`);
    console.log(`[DEV] Plan: ${data.planDisplayName}, Trial ends: ${data.trialEndDate}`);
    return;
  }

  const trialEndFormatted = data.trialEndDate 
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(data.trialEndDate)
    : 'in 3 days';

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>Just a heads up – your <strong>CodeComp ${data.planDisplayName}</strong> free trial ends in <strong>3 days</strong>.</p>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #f59e0b;">
      <p style="color: #92400e; margin: 0; font-size: 16px;">⏰ Your trial ends on</p>
      <p style="color: #92400e; margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">${trialEndFormatted}</p>
    </div>
    
    <p>After your trial ends, you'll be automatically subscribed to ${data.planDisplayName} at <strong>$${data.amount || 5}/${data.currency === 'year' ? 'year' : 'month'}</strong>.</p>
    
    <h3 style="color: #111827;">Want to keep your Pro features?</h3>
    <p>No action needed! Your subscription will automatically continue after the trial.</p>
    
    <h3 style="color: #111827;">Want to cancel?</h3>
    <p>You can cancel anytime before ${trialEndFormatted} in your billing settings. You won't be charged.</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `⏰ Your CodeComp trial ends in 3 days`,
      html: generateEmailTemplate('Trial Ending Soon', content, 'Manage Subscription', data.billingPortalUrl || 'https://codecomp.dev/settings/billing'),
    });
    console.log(`✅ Trial ending email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send trial ending email:', error);
  }
}

/**
 * Send email when subscription is activated (first payment)
 */
export async function sendSubscriptionActivatedEmail(
  email: string,
  data: SubscriptionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Subscription activated email for ${email}`);
    console.log(`[DEV] Plan: ${data.planDisplayName}`);
    return;
  }

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>Your <strong>CodeComp ${data.planDisplayName}</strong> subscription is now active! 🎉</p>
    
    <div style="background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #10b981;">
      <p style="color: #065f46; margin: 0; font-size: 18px; font-weight: bold;">✅ ${data.planDisplayName} Member</p>
      <p style="color: #065f46; margin: 10px 0 0 0;">Thank you for supporting CodeComp!</p>
    </div>
    
    ${data.amount ? `
    <p><strong>Amount charged:</strong> $${data.amount}${data.currency === 'year' ? '/year' : '/month'}</p>
    ` : ''}
    
    <h3 style="color: #111827;">Your Pro benefits are now active:</h3>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>✅ Unlimited code executions</li>
      <li>✅ Priority execution queue</li>
      <li>✅ 30-second execution timeout</li>
      <li>✅ Private competitions</li>
      <li>✅ 90-day execution history</li>
      ${data.seats ? `<li>✅ ${data.seats} member seats</li>` : ''}
    </ul>
    
    <p>Manage your subscription anytime in your billing settings.</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🎉 Welcome to CodeComp ${data.planDisplayName}!`,
      html: generateEmailTemplate('Subscription Activated', content, 'Start Coding', 'https://codecomp.dev/playground'),
    });
    console.log(`✅ Subscription activated email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send subscription activated email:', error);
  }
}

/**
 * Send email when payment fails
 */
export async function sendPaymentFailedEmail(
  email: string,
  data: SubscriptionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Payment failed email for ${email}`);
    console.log(`[DEV] Plan: ${data.planDisplayName}`);
    return;
  }

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>We had trouble processing your payment for <strong>CodeComp ${data.planDisplayName}</strong>.</p>
    
    <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #ef4444;">
      <p style="color: #991b1b; margin: 0; font-size: 18px; font-weight: bold;">⚠️ Payment Failed</p>
      <p style="color: #991b1b; margin: 10px 0 0 0;">Please update your payment method</p>
    </div>
    
    <p>Don't worry – your Pro features are still active. We'll retry the payment in a few days.</p>
    
    <p>To avoid any interruption to your service, please update your payment method:</p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `⚠️ Payment failed for your CodeComp subscription`,
      html: generateEmailTemplate('Payment Issue', content, 'Update Payment Method', data.billingPortalUrl || 'https://codecomp.dev/settings/billing'),
    });
    console.log(`✅ Payment failed email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}

/**
 * Send email when subscription is canceled
 */
export async function sendSubscriptionCanceledEmail(
  email: string,
  data: SubscriptionEmailData
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Subscription canceled email for ${email}`);
    console.log(`[DEV] Plan: ${data.planDisplayName}, Access until: ${data.periodEndDate}`);
    return;
  }

  const periodEndFormatted = data.periodEndDate 
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(data.periodEndDate)
    : 'the end of your billing period';

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>We're sorry to see you go! Your <strong>CodeComp ${data.planDisplayName}</strong> subscription has been canceled.</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="color: #374151; margin: 0; font-size: 16px;">Your Pro features remain active until</p>
      <p style="color: #111827; margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">${periodEndFormatted}</p>
    </div>
    
    <p>After that, you'll be moved to the free plan with:</p>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>30 code executions per day</li>
      <li>10-second execution timeout</li>
      <li>7-day execution history</li>
      <li>Public competitions only</li>
    </ul>
    
    <p><strong>Changed your mind?</strong> You can resubscribe anytime from your billing settings.</p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
      We'd love to know why you canceled. Reply to this email with any feedback – it helps us improve CodeComp for everyone!
    </p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Your CodeComp ${data.planDisplayName} subscription has been canceled`,
      html: generateEmailTemplate('Subscription Canceled', content, 'Resubscribe', data.upgradeUrl || 'https://codecomp.dev/pricing'),
    });
    console.log(`✅ Subscription canceled email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send subscription canceled email:', error);
  }
}

/**
 * Send email for subscription payment receipt
 */
export async function sendPaymentReceiptEmail(
  email: string,
  data: SubscriptionEmailData & { invoiceUrl?: string; invoiceNumber?: string }
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Payment receipt email for ${email}`);
    console.log(`[DEV] Amount: $${data.amount}`);
    return;
  }

  const content = `
    <p>Hi ${data.userName || 'there'},</p>
    
    <p>Thanks for your payment! Here's your receipt for <strong>CodeComp ${data.planDisplayName}</strong>.</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Plan</td>
          <td style="color: #111827; text-align: right; padding: 8px 0; font-weight: 500;">${data.planDisplayName}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Amount</td>
          <td style="color: #111827; text-align: right; padding: 8px 0; font-weight: 500;">$${data.amount}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Date</td>
          <td style="color: #111827; text-align: right; padding: 8px 0;">${new Date().toLocaleDateString()}</td>
        </tr>
        ${data.invoiceNumber ? `
        <tr>
          <td style="color: #6b7280; padding: 8px 0;">Invoice #</td>
          <td style="color: #111827; text-align: right; padding: 8px 0;">${data.invoiceNumber}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    ${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}" style="color: #667eea;">Download PDF Invoice</a></p>` : ''}
    
    <p style="color: #6b7280; font-size: 14px;">
      Questions about your billing? Reply to this email or visit your billing settings.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Receipt for your CodeComp ${data.planDisplayName} subscription`,
      html: generateEmailTemplate('Payment Receipt', content, 'View Billing', data.billingPortalUrl || 'https://codecomp.dev/settings/billing'),
    });
    console.log(`✅ Payment receipt email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
  }
}

/**
 * Send family/team member invitation email
 */
export async function sendFamilyInviteEmail(
  email: string,
  data: { 
    inviterName: string;
    planName: string;
    inviteUrl: string;
    expiresAt?: Date;
  }
): Promise<void> {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@codecomp.com';
  
  if (!transporter) {
    console.log(`[DEV] Family invite email for ${email}`);
    console.log(`[DEV] Inviter: ${data.inviterName}, Plan: ${data.planName}`);
    return;
  }

  const content = `
    <p>Hi there!</p>
    
    <p><strong>${data.inviterName}</strong> has invited you to join their <strong>CodeComp ${data.planName}</strong> plan! 🎉</p>
    
    <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="color: #ffffff; margin: 0; font-size: 18px;">You're invited to ${data.planName}!</p>
      <p style="color: #fce7f3; margin: 10px 0 0 0; font-size: 14px;">Get all Pro features at no extra cost</p>
    </div>
    
    <h3 style="color: #111827;">As a ${data.planName} member, you'll get:</h3>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>✅ Unlimited code executions</li>
      <li>✅ Priority execution queue</li>
      <li>✅ 30-second execution timeout</li>
      <li>✅ Private competitions</li>
      <li>✅ 90-day execution history</li>
    </ul>
    
    ${data.expiresAt ? `
    <p style="color: #6b7280; font-size: 14px;">
      This invitation expires on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(data.expiresAt)}.
    </p>
    ` : ''}
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `🎉 ${data.inviterName} invited you to CodeComp ${data.planName}!`,
      html: generateEmailTemplate(`Join ${data.planName}`, content, 'Accept Invitation', data.inviteUrl),
    });
    console.log(`✅ Family invite email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send family invite email:', error);
  }
}

