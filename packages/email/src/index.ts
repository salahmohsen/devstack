export { sendEmail } from "./resend";
export { toEmailSafeImageUrl } from "./public-image-url";
export { EMAIL_LOGO_CONTENT_ID, EMAIL_LOGO_SRC } from "./templates/layout-email";

export { default as AppNotificationEmail } from "./templates/app-notification-email";
export type { AppNotificationEmailProps } from "./templates/app-notification-email";
export { default as OutboundApplyEmail } from "./templates/outreach-apply-email";
export type { OutboundApplyEmailProps } from "./templates/outreach-apply-email";
export { renderOutreachApplyEmailHtml } from "./templates/outreach-apply-email";
export { default as InviteUserEmail } from "./templates/invite-user-email";
export type { InviteUserEmailProps } from "./templates/invite-user-email";
export { default as NotificationDigestEmail } from "./templates/notification-digest-email";
export { default as ResetPasswordEmail } from "./templates/reset-password-email";
export { default as SendMagicLinkEmail } from "./templates/send-magic-link-email";
export { default as SendVerificationOTP } from "./templates/send-verification-otp";
export { default as VerifyEmail } from "./templates/verify-email";
export { default as WelcomeEmail } from "./templates/welcome-email";
