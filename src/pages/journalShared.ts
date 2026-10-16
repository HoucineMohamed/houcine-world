import { useEffect } from "react";

// Small pieces shared by the two journal pages. The date format lives in src/content/format.ts.

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
