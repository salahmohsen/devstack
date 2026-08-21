import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { jobCompany } from "../schema/job-company.schema.ts";

export type JobCompanyEntity = InferSelectModel<typeof jobCompany>;

export type UpsertJobCompanyBySlugInput = {
  slug: string;
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  tagline?: string | null;
  employeeCount?: number | null;
  companySize?: string | null;
  companyType?: string | null;
  hqCountry?: string | null;
  profile?: Record<string, unknown>;
};

export const jobCompanyRepository = {
  async findBySlug(slug: string): Promise<JobCompanyEntity | null> {
    const [row] = await getDb().select().from(jobCompany).where(eq(jobCompany.slug, slug)).limit(1);
    return row ?? null;
  },

  async upsertBySlug(input: UpsertJobCompanyBySlugInput): Promise<JobCompanyEntity> {
    const slug = input.slug.trim();
    const existing = await this.findBySlug(slug);
    const now = new Date();

    if (!existing) {
      const [inserted] = await getDb()
        .insert(jobCompany)
        .values({
          id: crypto.randomUUID(),
          slug,
          name: input.name,
          logoUrl: input.logoUrl ?? null,
          website: input.website ?? null,
          tagline: input.tagline ?? null,
          employeeCount: input.employeeCount ?? null,
          companySize: input.companySize ?? null,
          companyType: input.companyType ?? null,
          hqCountry: input.hqCountry ?? null,
          profile: input.profile ?? {},
          firstSeenAt: now,
          updatedAt: now
        })
        .onConflictDoNothing({ target: jobCompany.slug })
        .returning();
      if (inserted) return inserted;
      const raced = await this.findBySlug(slug);
      if (raced) return this.mergeExisting(raced, input);
      throw new Error(`jobCompany upsert: conflict without existing row slug=${slug}`);
    }

    return this.mergeExisting(existing, input);
  },

  async mergeExisting(
    existing: JobCompanyEntity,
    input: UpsertJobCompanyBySlugInput
  ): Promise<JobCompanyEntity> {
    const [row] = await getDb()
      .update(jobCompany)
      .set({
        name: input.name,
        updatedAt: new Date(),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.website !== undefined ? { website: input.website } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
        ...(input.employeeCount !== undefined ? { employeeCount: input.employeeCount } : {}),
        ...(input.companySize !== undefined ? { companySize: input.companySize } : {}),
        ...(input.companyType !== undefined ? { companyType: input.companyType } : {}),
        ...(input.hqCountry !== undefined ? { hqCountry: input.hqCountry } : {}),
        ...(input.profile !== undefined
          ? { profile: { ...existing.profile, ...input.profile } }
          : {})
      })
      .where(eq(jobCompany.id, existing.id))
      .returning();
    if (!row) throw new Error(`Failed to update job_company slug=${input.slug}`);
    return row;
  }
};
