import posthog from "posthog-js";

let started = false;

/** PostHog is optional; it only initializes when the project token is configured. */
export const initAnalytics = () => {
  const token = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!token || started) return;
  const region = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string) || "eu";
  posthog.init(token, {
    api_host: region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
  });
  started = true;
};

export const analyticsEnabled = () => started;

/** Every workspace event is tagged with brand_id. */
export const captureBrandEvent = (
  event: string,
  brandId: string,
  props: Record<string, unknown> = {}
) => {
  if (!started) return;
  posthog.capture(event, { brand_id: brandId, ...props });
};
