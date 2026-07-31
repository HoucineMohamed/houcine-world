import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    // Let the browser handle scroll restoration for Back/Forward navigation.
    if (navigationType === "POP") {
      return;
    }

    if (hash) {
      const target = document.getElementById(hash.replace("#", ""));
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top);
        return;
      }
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollToTop;
