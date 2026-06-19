const { ENV_SERVER } = await import("../packages/env/src/server/env.ts");
const { sendEmail } = await import("../packages/email/src/resend.ts");
const welcomeEmailModule = await import("../packages/email/src/templates/welcome-email.tsx");
const welcomeEmail = welcomeEmailModule.default;

if (!ENV_SERVER.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY must be set to run the live Resend smoke test.");
}

const subject = `Resend live smoke test ${new Date().toISOString()}`;
const result = await sendEmail({
  subject,
  template: welcomeEmail({ username: "Live Resend Test" }),
  to: "salahmmohsen@gmail.com"
});

console.log(
  JSON.stringify(
    {
      from: ENV_SERVER.EMAIL_FROM,
      result,
      subject,
      to: "salahmmohsen@gmail.com"
    },
    null,
    2
  )
);
