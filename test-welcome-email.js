#!/usr/bin/env node

/**
 * Quick test script for welcome email system
 * 
 * Usage: node test-welcome-email.js your-test-email@example.com
 */

const { Resend } = require('resend')

async function testEmail() {
  const testEmail = process.argv[2]
  
  if (!testEmail) {
    console.error('❌ Please provide a test email address')
    console.log('Usage: node test-welcome-email.js your-email@example.com')
    process.exit(1)
  }

  // Load environment variables
  require('dotenv').config({ path: './frontend/.env.local' })

  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not found in .env.local')
    console.log('Please add: RESEND_API_KEY="re_xxxxx"')
    process.exit(1)
  }

  if (!apiKey.startsWith('re_')) {
    console.error('❌ Invalid RESEND_API_KEY format (should start with "re_")')
    process.exit(1)
  }

  console.log('✅ RESEND_API_KEY found')
  console.log(`📧 Sending test email to: ${testEmail}`)

  const resend = new Resend(apiKey)

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Epic Voice <onboarding@epic.dm>',
      to: testEmail,
      subject: '🧪 Test Email - Epic Voice Onboarding System',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5;">
          <div style="background: white; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea; margin: 0 0 20px 0;">✅ Email System Working!</h1>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your Epic Voice onboarding system is configured correctly and ready to send emails.
            </p>
            <div style="background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Test Details:</strong></p>
              <ul style="margin: 10px 0 0 0; color: #666;">
                <li>API Key: ✅ Valid</li>
                <li>Sending Domain: ${process.env.EMAIL_FROM || 'onboarding@epic.dm'}</li>
                <li>Service: Resend</li>
                <li>Time: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Next step: Create a new account to test the full welcome email flow!
            </p>
          </div>
        </body>
        </html>
      `
    })

    console.log('\n🎉 SUCCESS! Email sent!')
    console.log('📬 Email ID:', result.data?.id)
    console.log('\n📝 Next steps:')
    console.log('1. Check inbox for test email')
    console.log('2. Verify email looks good')
    console.log('3. Create a new account to test welcome email')
    console.log('4. Set up cron job for trial notifications')
    
  } catch (error) {
    console.error('\n❌ Error sending email:')
    console.error(error.message)
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Check that your RESEND_API_KEY is correct')
    }
    if (error.message.includes('domain')) {
      console.log('\n💡 You may need to verify your domain in Resend dashboard')
      console.log('   Visit: https://resend.com/domains')
    }
    
    process.exit(1)
  }
}

testEmail()
