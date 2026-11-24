import type { Metadata } from "next";

import { Fact, LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How the DocuTrust AI website and workspace handle personal data.",
};

const sections = [
  { id: "who", label: "Who we are" },
  { id: "website", label: "What this website collects" },
  { id: "use", label: "How we use it" },
  { id: "keep", label: "How long we keep it" },
  { id: "workspace", label: "Documents in a workspace" },
  { id: "cloud", label: "Optional cloud chat" },
  { id: "rights", label: "Your rights" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  const email = <Fact value={legal.contactEmail} label="Contact email" />;
  const operator = <Fact value={legal.operatorName} label="Operator name" />;

  return (
    <LegalPage
      title="Privacy policy"
      effective={legal.effectiveDate}
      sections={sections}
      intro="This policy explains what personal data the DocuTrust AI website collects, why we collect it, and what happens to the documents you put into a DocuTrust workspace."
    >
      <h2 id="who">Who we are</h2>
      <p>
        This website and the DocuTrust AI software are run by {operator}. In this policy “we” and “us” mean the
        operator. You can reach us at {email}.
      </p>

      <h2 id="website">What this website collects</h2>
      <h3>When you request early access</h3>
      <p>
        The request form asks for your full name, work email, organisation, team size, the plan you are interested in
        and an optional note. We store these details in a database on our own server. They are not sent to any
        mailing, analytics or advertising service.
      </p>
      <h3>Cookies and browser storage</h3>
      <ul>
        <li>
          <strong>theme</strong>: your light or dark choice, kept in your browser&apos;s local storage. It is never sent
          to us.
        </li>
        <li>
          <strong>Administrator session</strong>: only people who sign in to the admin area receive a session cookie
          and a security cookie that protects their forms.
        </li>
      </ul>
      <p>
        Visitors to the public site receive no cookies. We do not use analytics, advertising, tracking pixels or social
        media plugins. Fonts, scripts and icons are served from our own server, so visiting this site does not contact
        any third party.
      </p>
      <h3>Server logs</h3>
      <p>
        Like most web servers, ours may record the IP address, time and page of each request for troubleshooting and
        security. These logs are not combined with form data or used to profile visitors.
      </p>

      <h2 id="use">How we use your information</h2>
      <ul>
        <li>To reply to your early-access request and arrange a pilot.</li>
        <li>To understand which kinds of teams need DocuTrust, using the team size and plan fields.</li>
        <li>To keep the website secure.</li>
      </ul>
      <p>
        We do not sell, rent or share your details, and we do not add you to a newsletter. We handle form data because
        you asked us to contact you. We keep logs because we have a legitimate interest in keeping the service safe.
      </p>

      <h2 id="keep">How long we keep it</h2>
      <p>
        We keep an early-access request for up to 12 months after our last contact with you, then delete it. You can
        ask us to delete it sooner at any time.
      </p>

      <h2 id="workspace">Documents in a DocuTrust workspace</h2>
      <p>
        The DocuTrust workspace runs on a computer chosen by the organisation that installs it. Uploaded documents, the
        search index, questions, answers and the activity ledger are stored in a local database on that computer. By
        default none of it is sent to us or to any other service.
      </p>
      <p>
        The organisation running the workspace decides who has accounts, which documents are uploaded and how long
        they are kept, and it is responsible for that data. Questions about it should go to that organisation&apos;s
        administrator.
      </p>
      <p>
        The activity ledger records who uploaded, shared, asked or changed what, and when. It exists so the
        organisation can check its own records, and it cannot be edited without detection.
      </p>

      <h2 id="cloud">Optional cloud chat</h2>
      <p>
        An administrator can switch the chat step to Google Gemini. While this is on, each question and the passages
        found for it are sent to Google to write the answer, under Google&apos;s own terms and privacy policy. The
        workspace shows a notice on every screen while cloud chat is active. Search indexing always stays on the local
        machine.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>
        You can ask us for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it.
        You can also object to how we use it. Email us at {email} and we will reply within 30 days. If you are not
        satisfied, you may complain to the data protection authority in your country.
      </p>
      <p>This website is not directed at children under 16, and we do not knowingly collect their data.</p>

      <h2 id="changes">Changes to this policy</h2>
      <p>
        If we change how we handle personal data, we will update this page and its effective date. If a change affects
        data we already hold, we will tell the people concerned before it applies.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        {operator}
        <br />
        {email}
        <br />
        <Fact value={legal.country} label="Country" />
      </p>
    </LegalPage>
  );
}
