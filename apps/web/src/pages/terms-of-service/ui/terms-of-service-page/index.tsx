import { LegalDocument } from "@/shared/ui/legal-document";

import Content from "@/pages/terms-of-service/ui/terms-of-service-page/content.mdx";

const EFFECTIVE_DATE = "March 2, 2026";

/** Kept for deep links; footer points at Privacy policy only. */
export function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      <Content />
    </LegalDocument>
  );
}
