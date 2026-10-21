// One place for every public contact address across the ecosystem. Each service routes
// enquiries to its own address; CONTACT_EMAIL is the general/administration fallback.
export const CONTACT_EMAIL = "contact@houcine.world";

export const SERVICE_EMAILS = {
  tech: "tech@houcine.world",
  studio: "studio@houcine.world",
  education: "education@houcine.world",
  management: "management@houcine.world",
  larosaview: "larosaview@houcine.world",
} as const;

export type ServiceEmailKey = keyof typeof SERVICE_EMAILS;

// The public phone number for Mohamed Houcine. Keep the display format exactly as given;
// the dialable form (no spaces, no leading 0 after the country code) goes in the tel: link.
export const CONTACT_PHONE_DISPLAY = "+33 0746503304";
export const CONTACT_PHONE_TEL = "+33746503304";

export const PAYMENT_CURRENCIES = "EUR and USD";
export const PAYMENT_METHODS = "Revolut and Société Générale";
export const PAYMENT_POLICY_TEXT =
  "Prices are displayed in EUR or USD. Accepted payment methods are Revolut and Société Générale.";

const EMAIL_SHAPE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

/** A mailto: link for a given address with an optional subject, or null if the address isn't valid. */
export const contactMailto = (email: string = CONTACT_EMAIL, subject?: string): string | null => {
  if (!EMAIL_SHAPE.test(email)) return null;
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${query}`;
};
