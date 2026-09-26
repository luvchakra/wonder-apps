import { site } from "./site";

export type LegalSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type LegalDoc = { slug: string; title: string; summary: string; sections: LegalSection[] };

const contact = `Questions about this document can be sent through the contact form at ${site.url}${site.contactPath}, or by emailing ${site.contactEmail}.`;

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary:
      "This site is a static portfolio. The only personal data it collects is what you choose to send through the contact form.",
    sections: [
      {
        heading: "1. Who we are",
        paragraphs: [
          `${site.legalName} operates this website to present the WonderHome, WonderJobs, WonderArk and WonderID products to prospective investors and partners. Each product has its own privacy policy governing its own users; this policy covers only this portfolio site.`,
        ],
      },
      {
        heading: "2. What we collect",
        paragraphs: [
          "This website has no accounts, no database and no analytics cookies. Pages are served as static files.",
          "If you submit the contact form, we receive the fields you fill in: your name, email address, organisation, the products you are interested in, and your message. Nothing else on the site records information about you.",
        ],
      },
      {
        heading: "3. How the contact form works",
        paragraphs: [
          "Your submission is sent as an email to the founder's inbox using Resend, a transactional email provider. It is not stored in a database operated by us. Resend processes the message as our sub-processor solely to deliver it; see Resend's own privacy policy for its retention and security practices.",
          "We use your submission to reply to you. We do not add you to a mailing list and we do not share your details with third parties for marketing.",
        ],
      },
      {
        heading: "4. Legal basis and retention",
        paragraphs: [
          "We process contact-form data on the basis of your consent and our legitimate interest in responding to enquiries. Messages are kept in the inbox for as long as the conversation is live and deleted when it is no longer needed, or sooner on request.",
        ],
      },
      {
        heading: "5. Your rights",
        paragraphs: [
          "You may ask us at any time to show you, correct or delete the information you sent us. Where the law of your jurisdiction grants further rights (including under the GDPR or India's Digital Personal Data Protection Act, 2023), we honour them.",
          contact,
        ],
      },
      {
        heading: "6. Hosting and transfers",
        paragraphs: [
          "The site is hosted on Vercel's global edge network, and email is delivered by Resend. Both may process data outside your country. We rely on their standard contractual protections for such transfers.",
        ],
      },
      {
        heading: "7. Changes",
        paragraphs: [`We will post any change to this policy on this page and update the date below. Last updated ${site.lastUpdated}.`],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    summary: "Plain rules for reading this site. They are not the terms of any Wonder product.",
    sections: [
      {
        heading: "1. Acceptance",
        paragraphs: [
          `By using this website you agree to these terms. If you do not agree, please do not use the site. These terms apply only to ${site.url}; each product linked from here has its own terms.`,
        ],
      },
      {
        heading: "2. Purpose of the site",
        paragraphs: [
          "This site provides an informational overview of four software products for prospective investors, partners and the curious. Nothing on it is an offer to sell, or a solicitation of an offer to buy, any security in any jurisdiction. See the Investor Disclaimer.",
        ],
      },
      {
        heading: "3. Intellectual property",
        paragraphs: [
          `The text, design, screenshots, logos and code of this site are owned by ${site.legalName} or used with permission. You may view and share links freely. You may not reproduce the content commercially without written consent. Third-party marks (for example Supabase, Vercel, Anthropic, Saviynt, Okta or Microsoft Entra) belong to their owners and are referenced descriptively.`,
        ],
      },
      {
        heading: "4. Accuracy",
        paragraphs: [
          "We try to keep the site accurate and current. Products described here are early-stage and change frequently; features, plans, prices and roadmaps may differ from what is shown. We make no warranty that the content is complete or error-free.",
        ],
      },
      {
        heading: "5. Links",
        paragraphs: [
          "Links to the live products and to third-party sites are provided for convenience. We are not responsible for the content or practices of third-party sites.",
        ],
      },
      {
        heading: "6. Limitation of liability",
        paragraphs: [
          "To the fullest extent permitted by law, we are not liable for any loss arising from your use of, or reliance on, this site.",
        ],
      },
      {
        heading: "7. Governing law",
        paragraphs: [`These terms are governed by the laws of ${site.jurisdiction}, without regard to conflict-of-law rules. Last updated ${site.lastUpdated}.`, contact],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "This site sets no cookies of its own.",
    sections: [
      {
        heading: "1. What we set",
        paragraphs: [
          "Nothing. The site uses no analytics, advertising or preference cookies, and no local storage for tracking. There is no cookie banner because there is nothing to consent to.",
        ],
      },
      {
        heading: "2. What our hosting provider may set",
        paragraphs: [
          "Vercel, which serves the site, may set strictly necessary technical cookies to route traffic or protect against abuse. These are not used to identify you across sites.",
        ],
      },
      {
        heading: "3. Linked products",
        paragraphs: [
          "When you follow a link to WonderHome, WonderJobs, WonderArk or WonderID, you leave this site and that product's own cookie policy applies.",
        ],
      },
      { heading: "4. Changes", paragraphs: [`If this ever changes, we will update this page and the date. Last updated ${site.lastUpdated}.`] },
    ],
  },
  {
    slug: "disclaimer",
    title: "Investor Disclaimer",
    summary: "Read this before treating anything on this site as the basis for an investment decision.",
    sections: [
      {
        heading: "1. No offer",
        paragraphs: [
          "This website is for information only. It does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation of any security, and it is not a prospectus, offering memorandum or private placement document. Any investment would be made only through definitive legal documents, to qualified persons, and in compliance with applicable securities law.",
        ],
      },
      {
        heading: "2. Early-stage risk",
        paragraphs: [
          "All four products are early-stage. They have limited operating history and, at the date of this site, are pre-revenue or early-revenue. Investing in early-stage companies involves a high degree of risk, including the total loss of capital. Past build velocity is not a guarantee of future commercial performance.",
        ],
      },
      {
        heading: "3. Forward-looking statements",
        paragraphs: [
          "Roadmaps, market descriptions, plan names, pricing shapes and 'why now' arguments on this site are forward-looking. They reflect the founder's current intentions and beliefs, are subject to change without notice, and may not materialise.",
        ],
      },
      {
        heading: "4. Figures and screenshots",
        paragraphs: [
          "Build-progress figures (stories completed, modules shipped) are taken from each product's own public engineering trackers on the stated date. Screenshots show the products as deployed at capture time and may include demonstration data. Illustrative scenarios and example quotes on the product sites are clearly labelled as such on those sites and are not customer testimonials.",
        ],
      },
      {
        heading: "5. Do your own diligence",
        paragraphs: [
          "Nothing here is legal, tax, accounting or investment advice. Prospective investors should conduct their own diligence and consult their own advisers. The founder will make source code, trackers and live demos available to serious parties on request.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    summary: "We want every investor and reader to be able to use this site, whatever their device or ability.",
    sections: [
      {
        heading: "1. Our standard",
        paragraphs: [
          "This site aims to conform to WCAG 2.2 Level AA. Text meets contrast targets in both light and dark colour schemes, all interactive elements are keyboard reachable with a visible focus state, images carry descriptive alternative text, and the layout reflows to a 320-pixel-wide viewport without horizontal scrolling.",
        ],
      },
      {
        heading: "2. Motion",
        paragraphs: [
          "The site uses scroll-linked parallax and entrance animation. If your operating system requests reduced motion, these animations are disabled and content is shown in place.",
        ],
      },
      {
        heading: "3. Known limitations",
        paragraphs: [
          "Product screenshots are images and cannot convey every detail to screen-reader users; each has a caption describing what it shows. The live products linked from this site maintain their own accessibility commitments.",
        ],
      },
      {
        heading: "4. Tell us",
        paragraphs: ["If something on this site is hard for you to use, please tell us and we will fix it.", contact],
      },
    ],
  },
  {
    slug: "security",
    title: "Security",
    summary: "How this site, and the products it presents, treat security.",
    sections: [
      {
        heading: "1. This site",
        paragraphs: [
          "The site is static: no accounts, no database, no server-side session. The single server function handles the contact form, validates input, rejects automated submissions with a honeypot field, and forwards the message by email. No secrets are shipped to the browser; the email provider key lives only in the hosting environment.",
        ],
      },
      {
        heading: "2. The products",
        paragraphs: [
          "All four Wonder products share one security baseline: Supabase PostgreSQL with row-level security on every tenant-scoped table, server-side tenant resolution that never trusts a client-supplied identifier, encrypted-at-rest provider credentials, an immutable audit trail for consequential actions, and deterministic (non-LLM) authorisation. Each product publishes its own security page or help section with specifics.",
        ],
      },
      {
        heading: "3. Reporting a vulnerability",
        paragraphs: [
          `If you believe you have found a security issue in this site or any Wonder product, please report it through the contact form and mark it as a security report, or email ${site.contactEmail} directly. We will acknowledge promptly and keep you informed. Please do not test against production tenants that are not yours.`,
        ],
      },
    ],
  },
];

export const legalBySlug = (slug: string) => legalDocs.find((d) => d.slug === slug);
