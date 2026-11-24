import type { Metadata } from "next";
import Link from "next/link";

import { Fact, LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using the DocuTrust AI website and early-access software.",
};

const sections = [
  { id: "agreement", label: "1. Agreement" },
  { id: "service", label: "2. The service" },
  { id: "early", label: "3. Early access" },
  { id: "content", label: "4. Your documents" },
  { id: "answers", label: "5. Answers" },
  { id: "use", label: "6. Acceptable use" },
  { id: "third", label: "7. Third-party services" },
  { id: "ours", label: "8. Our rights" },
  { id: "liability", label: "9. Warranty and liability" },
  { id: "ending", label: "10. Ending use" },
  { id: "law", label: "11. Governing law" },
  { id: "changes", label: "12. Changes" },
  { id: "contact", label: "13. Contact" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      effective={legal.effectiveDate}
      sections={sections}
      intro="These terms apply when you use the DocuTrust AI website or the DocuTrust workspace software. Please read them before you request early access or install the software."
    >
      <h2 id="agreement">1. Agreement</h2>
      <p>
        By using the website or the software you agree to these terms. If you use DocuTrust on behalf of an
        organisation, you confirm that you may accept them for that organisation. The service is offered by{" "}
        <Fact value={legal.operatorName} label="Operator name" /> (“we”, “us”).
      </p>

      <h2 id="service">2. The service</h2>
      <p>
        DocuTrust AI is software that indexes documents an organisation provides and answers questions from them, with
        citations to the passages used. It runs on a computer chosen by the organisation and records activity in a
        tamper-evident ledger.
      </p>

      <h2 id="early">3. Early access</h2>
      <p>
        DocuTrust is pre-release software in active development. During early access it is free of charge. Features
        may change, be added or be removed, and early access may end. We will give reasonable notice before early
        access ends or before any paid plan could apply to you. Nothing becomes payable without your separate
        agreement.
      </p>

      <h2 id="content">4. Your documents</h2>
      <p>
        You keep all rights to the documents you upload and the questions you ask. We do not receive them unless you
        send them to us. You are responsible for having the right to upload each document and for deciding who in your
        organisation may open it.
      </p>

      <h2 id="answers">5. Answers are a starting point</h2>
      <p>
        Answers are written by a language model from the passages DocuTrust finds. They can be incomplete or wrong,
        even with citations. Check the cited passage before relying on an answer, and do not treat answers as legal,
        financial, medical or other professional advice.
      </p>

      <h2 id="use">6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>upload material you have no right to use, or that is unlawful;</li>
        <li>try to open documents or accounts you are not permitted to see;</li>
        <li>edit, delete or forge activity ledger entries, or help anyone else do so;</li>
        <li>attack, overload or probe the website or software for weaknesses without our written permission;</li>
        <li>send spam or false information through the request form.</li>
      </ul>

      <h2 id="third">7. Third-party services</h2>
      <p>
        DocuTrust uses Ollama to run language models locally. If an administrator enables Google Gemini for chat,
        questions and the passages found for them are processed by Google under Google&apos;s terms. We do not control
        those services, and their own terms apply.
      </p>

      <h2 id="ours">8. Our rights</h2>
      <p>
        The DocuTrust name, logo, website and software belong to us. These terms let you use them for the service
        described here, not copy, resell or present them as your own.
      </p>

      <h2 id="liability">9. Warranty and liability</h2>
      <p>
        Because DocuTrust is pre-release and free during early access, it is provided “as is”, without warranties of
        any kind, including fitness for a particular purpose. Keep your own copies of important documents. As far as
        the law allows, we are not liable for indirect or consequential losses, lost data or lost profits arising from
        use of the service. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2 id="ending">10. Ending use</h2>
      <p>
        You can stop using DocuTrust at any time and ask us to delete your early-access request. We may suspend access
        for anyone who breaks these terms. Sections 4, 5, 8 and 9 continue to apply after use ends.
      </p>

      <h2 id="law">11. Governing law</h2>
      <p>
        These terms are governed by the laws of <Fact value={legal.country} label="Country" />, and disputes will be
        handled by the courts there.
      </p>

      <h2 id="changes">12. Changes</h2>
      <p>
        We may update these terms as the service develops. We will post the new version here with a new effective
        date, and for significant changes we will tell early-access teams by email first.
      </p>

      <h2 id="contact">13. Contact</h2>
      <p>
        Questions about these terms go to <Fact value={legal.contactEmail} label="Contact email" />. How we handle
        personal data is described in our <Link href="/privacy">Privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
