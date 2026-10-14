/**
 * One entry in a service page's "Selected work" gallery.
 * Only add real, published work you have the right to show. No invented clients or numbers.
 */
export interface WorkItem {
  /** Short title, shown as the card heading. */
  title: string;
  /** One or two plain sentences about the work. */
  summary: string;
  /** Optional image imported from src/assets (never a URL on another host). */
  image?: string;
  /** Required whenever `image` is set: describes the image for screen readers. */
  imageAlt?: string;
  /** Optional link: an internal route ("/larosaview") or an https URL you own or are allowed to link. */
  href?: string;
  /** Optional short labels, e.g. ["Brand strategy"]. */
  tags?: string[];
}
