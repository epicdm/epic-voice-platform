/**
 * Email Service using Resend
 * Handles all transactional emails for Epic Voice
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'Epic Voice <onboarding@epic.dm>'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@epic.dm'

export interface WelcomeEmailData {
  name: string
  email: string
  trialEndsAt: Date
  loginUrl: string
}

export interface TrialExpirationEmailData {
  name: string
  email: string
  daysLeft: number
  trialEndsAt: Date
  upgradeUrl: string
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(data: WelcomeEmailData) {
  try {
    const trialDays = Math.ceil((data.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      replyTo: REPLY_TO,
      subject: '🎉 Welcome to Epic Voice - Your AI Voice Platform',
      html: generateWelcomeEmail(data, trialDays),
    })

    console.log(`✅ Welcome email sent to ${data.email}`, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error)
    return { success: false, error }
  }
}

/**
 * Send trial expiration warning email
 */
export async function sendTrialExpirationEmail(data: TrialExpirationEmailData) {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      replyTo: REPLY_TO,
      subject: `⏰ ${data.daysLeft} ${data.daysLeft === 1 ? 'Day' : 'Days'} Left in Your Epic Voice Trial`,
      html: generateTrialExpirationEmail(data),
    })

    console.log(`✅ Trial expiration email sent to ${data.email} (${data.daysLeft} days left)`, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('❌ Failed to send trial expiration email:', error)
    return { success: false, error }
  }
}

/**
 * Send trial expired email
 */
export async function sendTrialExpiredEmail(data: Omit<TrialExpirationEmailData, 'daysLeft'>) {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      replyTo: REPLY_TO,
      subject: '🚨 Your Epic Voice Trial Has Ended',
      html: generateTrialExpiredEmail(data),
    })

    console.log(`✅ Trial expired email sent to ${data.email}`, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('❌ Failed to send trial expired email:', error)
    return { success: false, error }
  }
}

/**
 * Generate welcome email HTML
 */
function generateWelcomeEmail(data: WelcomeEmailData, trialDays: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Epic Voice</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 32px;">🎉 Welcome to Epic Voice!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your AI Voice Platform is Ready</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
    <p>Hi ${data.name || 'there'},</p>
    
    <p>Thanks for joining Epic Voice! We're excited to have you on board. 🚀</p>
    
    <div style="background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 20px 0;">
      🎁 ${trialDays}-Day Free Trial Activated
    </div>
    
    <p>You now have full access to create AI voice agents, manage phone numbers, and make calls. No credit card required!</p>

    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0;">🚀 Get Started in 3 Steps:</h3>
      
      <div style="margin: 15px 0; padding-left: 30px;">
        <strong>1. Create Your First Agent</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280;">Build an AI voice agent with custom prompts and voice selection</p>
      </div>
      
      <div style="margin: 15px 0; padding-left: 30px;">
        <strong>2. Get a Phone Number</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280;">Assign a phone number to your agent for incoming calls</p>
      </div>
      
      <div style="margin: 15px 0; padding-left: 30px;">
        <strong>3. Make a Test Call</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280;">Call your agent and experience the magic!</p>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Launch Dashboard →</a>
    </div>

    <p><strong>What you can do:</strong></p>
    <ul>
      <li>🤖 Create unlimited AI voice agents</li>
      <li>📞 Provision phone numbers instantly</li>
      <li>📊 Track calls and performance analytics</li>
      <li>⚡ Lightning-fast real-time AI responses</li>
    </ul>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Need help? Reply to this email or visit our <a href="https://ai.epic.dm/docs" style="color: #667eea;">documentation</a>.</p>
    <p style="margin-top: 15px;">
      Epic Voice Team<br>
      <a href="https://ai.epic.dm" style="color: #667eea;">ai.epic.dm</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate trial expiration warning email HTML
 */
function generateTrialExpirationEmail(data: TrialExpirationEmailData): string {
  const color = data.daysLeft === 1 ? '#ef4444' : data.daysLeft <= 3 ? '#f59e0b' : '#3b82f6'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trial Ending Soon</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0; background: ${color}; color: white; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 32px;">⏰ Trial Ending Soon</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
    <p>Hi ${data.name},</p>
    
    <div style="background: white; border: 3px solid ${color}; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0;">
      <div style="font-size: 64px; font-weight: bold; color: ${color}; line-height: 1;">${data.daysLeft}</div>
      <div style="font-size: 24px; color: #6b7280; margin-top: 10px;">${data.daysLeft === 1 ? 'Day' : 'Days'} Left</div>
    </div>
    
    <p>Your Epic Voice free trial ends on <strong>${data.trialEndsAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
    
    ${data.daysLeft === 1 ? `
      <p><strong>This is your last day!</strong> After midnight, your account will be restricted to view-only mode.</p>
    ` : `
      <p>Don't lose access to your AI voice agents. Upgrade now to keep everything running smoothly.</p>
    `}
    
    <div style="text-align: center;">
      <a href="${data.upgradeUrl}" style="display: inline-block; padding: 15px 40px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">Upgrade Now →</a>
    </div>
    
    <p style="margin-top: 30px;"><strong>What happens when your trial ends?</strong></p>
    <ul style="color: #6b7280;">
      <li>Your agents will stop accepting calls</li>
      <li>Phone numbers will be released</li>
      <li>You'll have view-only access to your account</li>
      <li>All data will be preserved for 30 days</li>
    </ul>
    
    <p>Questions? Reply to this email and we'll help you out!</p>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Epic Voice Team<br>
    <a href="https://ai.epic.dm" style="color: #667eea;">ai.epic.dm</a></p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate trial expired email HTML
 */
function generateTrialExpiredEmail(data: Omit<TrialExpirationEmailData, 'daysLeft'>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trial Ended</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0; background: #ef4444; color: white; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="margin: 0;">🚨 Your Trial Has Ended</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
    <p>Hi ${data.name},</p>
    
    <p>Your 14-day free trial of Epic Voice has ended. Your account is now in view-only mode.</p>
    
    <p><strong>Good news!</strong> All your data is safe and preserved. Upgrade now to restore full access to:</p>
    
    <ul>
      <li>✅ All your AI voice agents</li>
      <li>✅ Phone numbers and call routing</li>
      <li>✅ Call history and analytics</li>
      <li>✅ Unlimited calls and usage</li>
    </ul>
    
    <div style="text-align: center;">
      <a href="${data.upgradeUrl}" style="display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">Upgrade Now →</a>
    </div>
    
    <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 5px;">
      <strong>⚠️ Data Retention:</strong> Your data will be kept for 30 days. After that, it will be permanently deleted.
    </p>
    
    <p>Have questions? Reply to this email and we'll assist you!</p>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Epic Voice Team<br>
    <a href="https://ai.epic.dm" style="color: #667eea;">ai.epic.dm</a></p>
  </div>
</body>
</html>
  `.trim()
}

export const email = {
  sendWelcomeEmail,
  sendTrialExpirationEmail,
  sendTrialExpiredEmail,
}
