// Email utility functions
export async function sendEmail(to: string, subject: string, html: string) {
  // TODO: Implement with Resend or your email provider
  console.log(`Sending email to ${to}: ${subject}`);
  return { success: true };
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail(
    to,
    "Welcome to LiveKit Voice Agents",
    `<h1>Welcome ${name}!</h1>`
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail(
    to,
    "Password Reset Request",
    `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
  );
}

export async function sendTrialExpirationEmail(data: {
  name: string;
  email: string;
  daysLeft: number;
  trialEndsAt: Date;
  upgradeUrl: string;
}) {
  const { name, email, daysLeft, upgradeUrl } = data;
  return sendEmail(
    email,
    `Your trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    `<h1>Hi ${name},</h1>
     <p>Your trial will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.</p>
     <p>Upgrade now to continue using our service without interruption.</p>
     <p><a href="${upgradeUrl}">Upgrade Now</a></p>`
  );
}

export async function sendTrialExpiredEmail(data: {
  name: string;
  email: string;
  trialEndsAt: Date;
  upgradeUrl: string;
}) {
  const { name, email, upgradeUrl } = data;
  return sendEmail(
    email,
    "Your trial has expired",
    `<h1>Hi ${name},</h1>
     <p>Your trial period has ended.</p>
     <p>Please upgrade to a paid plan to continue using our service.</p>
     <p><a href="${upgradeUrl}">Upgrade Now</a></p>`
  );
}
