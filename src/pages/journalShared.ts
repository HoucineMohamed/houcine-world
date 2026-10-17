import { useEffect } from "react";

// Small pieces shared by the two journal pages.

/** "16 October 2026" from "2026-10-16", in UTC so the day never shifts with the visitor's time zone. */
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const FEED_LINK_ID = "journal-feed";

/** Adds <link rel="alternate" type="application/rss+xml"> while a journal page is shown. */
export const useFeedLink = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.id = FEED_LINK_ID;
    link.rel = "alternate";
    link.type = "application/rss+xml";
    link.title = "Houcine.world journal";
    link.href = "/rss.xml";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
};
