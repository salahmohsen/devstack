import { LegalDocument } from "@/shared/ui/legal-document";

import Content from "@/pages/privacy-policy/ui/privacy-policy-page-content.mdx";

const EFFECTIVE_DATE = "February 4, 2026";

export function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <Content />
    </LegalDocument>
  );
}
