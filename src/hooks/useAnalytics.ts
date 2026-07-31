import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve visitor ID
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
};

// Detect device type
const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

// Page name mapping
const PAGE_NAMES: Record<string, string> = {
  "/": "Houcine.world",
  "/dev": "Houcine.tech",
  "/designs": "Houcine.studio",
  "/reads": "Houcine.education",
  "/larosaview": "La Rosa View",
  "/booking": "La Rosa Booking",
  "/about": "About Me",
  "/about-dj": "About DJ",
  "/review": "Review",
  "/manages": "Manages",
};

export const usePageTracking = () => {
  const location = useLocation();
  const hasTracked = useRef<string | null>(null);

  useEffect(() => {
    // Only track if we haven't tracked this path yet in this render
    if (hasTracked.current === location.pathname) return;
    hasTracked.current = location.pathname;

    const trackPageView = async () => {
      try {
        await supabase.from("page_views").insert([{
          page_path: location.pathname,
          page_name: PAGE_NAMES[location.pathname] || location.pathname,
          visitor_id: getVisitorId(),
          device_type: getDeviceType(),
          referrer: document.referrer || null,
        }]);
      } catch (error) {
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};

export const useCtaTracking = () => {
  const location = useLocation();

  const trackEvent = useCallback(
    async (eventType: string, metadata?: Record<string, string | number | boolean>) => {
      try {
        await supabase.from("cta_events").insert([{
          event_type: eventType,
          page_path: location.pathname,
          page_name: PAGE_NAMES[location.pathname] || location.pathname,
          visitor_id: getVisitorId(),
          device_type: getDeviceType(),
          metadata: metadata || null,
        }]);
      } catch (error) {
        console.error("Failed to track CTA event:", error);
      }
    },
    [location.pathname]
  );

  return { trackEvent };
};
