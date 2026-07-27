import { z } from "zod";

/** DNS ownership status for a custom domain row. */
export const CustomDomainStatusSchema = z.enum(["pending", "verified", "failed"]);
export type CustomDomainStatus = z.infer<typeof CustomDomainStatusSchema>;

/**
 * Normalized public hostname (FQDN).
 * Lowercase labels, no port/path/scheme, no trailing dots.
 */
export const HostnameSchema = z
  .string()
  .trim()
  .min(1, "Hostname is required")
  .max(253, "Hostname is too long")
  .refine((value) => !value.includes("://"), "Do not include a URL scheme")
  .refine((value) => !value.includes("/"), "Do not include a path")
  .refine((value) => !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value), "IP addresses are not allowed")
  .refine((value) => !value.includes(":"), "Do not include a port")
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
    "Enter a valid domain name (e.g. portfolio.example.com)"
  );

export type Hostname = z.infer<typeof HostnameSchema>;

export const SetCustomDomainInputSchema = z.object({
  hostname: z.string().min(1)
});
export type SetCustomDomainInput = z.infer<typeof SetCustomDomainInputSchema>;

export const CustomDomainOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  hostname: z.string(),
  status: CustomDomainStatusSchema,
  verificationToken: z.string(),
  verifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  /** TXT record host label, e.g. `_career-verify.example.com` */
  verificationRecordName: z.string(),
  /** Expected TXT value (same as verificationToken) */
  verificationRecordValue: z.string()
});
export type CustomDomainOutput = z.infer<typeof CustomDomainOutputSchema>;

export const PublicPortfolioModeSchema = z.enum(["custom_domain", "path"]);
export type PublicPortfolioMode = z.infer<typeof PublicPortfolioModeSchema>;

/** Resolved public portfolio identity for Host or path routing. */
export const PublicPortfolioContextOutputSchema = z.object({
  userId: z.string(),
  profileName: z.string(),
  mode: PublicPortfolioModeSchema
});
export type PublicPortfolioContextOutput = z.infer<typeof PublicPortfolioContextOutputSchema>;

export const ResolvePublicPortfolioInputSchema = z.object({
  host: z.string().optional(),
  profileName: z.string().optional()
});
export type ResolvePublicPortfolioInput = z.infer<typeof ResolvePublicPortfolioInputSchema>;
