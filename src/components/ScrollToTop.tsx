import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    // Let the browser handle scroll restoration for Back/Forward navigation.
    if (navigationType === "POP") {
      console.log("ScrollToTop POP skipped", pathname, hash);
      return;
    }
    console.log("ScrollToTop running", pathname, hash, navigationType);

    if (hash) {
      const target = document.getElementById(hash.replace("#", ""));
      if (target) {
        target.scrollIntoView({ behavior: "auto" });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollToTop;
