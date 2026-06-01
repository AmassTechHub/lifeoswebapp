/** Dev-friendly password reset delivery. Replace with Resend/SendGrid in production. */
export async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("\n[Life OS] Password reset link");
    console.log(`  Email: ${email}`);
    console.log(`  URL:   ${url}\n`);
  }

  // Production: plug in your email provider here.
}
