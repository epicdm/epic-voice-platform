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
