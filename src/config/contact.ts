// One place for the public contact address used by the service pages' call to action.
//
// PLACEHOLDER: empty until the owner fills it in. While it is empty (or not a plain
// email address), the call to action shows "Contact details coming soon" and no link.
// Example: export const CONTACT_EMAIL = "hello@example.com";
export const CONTACT_EMAIL = "";

const EMAIL_SHAPE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

/** A mailto: link for CONTACT_EMAIL with an optional subject, or null while no valid address is set. */
export const contactMailto = (subject?: string): string | null => {
  if (!EMAIL_SHAPE.test(CONTACT_EMAIL)) return null;
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${CONTACT_EMAIL}${query}`;
};
