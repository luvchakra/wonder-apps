import { site } from "@/content/site";

/**
 * A `mailto:` link with a ready-to-send subject and body, so an interested
 * reader only has to fill in a few blanks. `name` is the startup the enquiry
 * is about; the address is always site.contactEmail.
 */
export function enquiryMailto(name: string): string {
  const portfolio = name === site.name;
  const subject = portfolio ? "Investor enquiry: WonderApps portfolio" : `Investor enquiry: ${name}`;
  const body = [
    "Hello,",
    "",
    portfolio
      ? "I have been through the WonderApps portfolio and would like to talk."
      : `I have been through the ${name} page and deck and would like to learn more.`,
    "",
    "Name:",
    "Organisation / fund:",
    "Role:",
    "I am interested in: (investing / partnering / a product walkthrough / something else)",
    "Best way and time to reach me:",
    "",
    "Thank you,",
  ].join("\r\n");
  return `mailto:${site.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
