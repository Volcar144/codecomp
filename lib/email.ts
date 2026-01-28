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
