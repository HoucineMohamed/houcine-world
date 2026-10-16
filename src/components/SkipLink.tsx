// "Skip to content": the first thing a keyboard user reaches on every page. It moves focus to the page's
// <main> landmark (every public page has one), so the header and menus can be skipped.
const SkipLink = () => (
  <a
    href="#main"
    onClick={(e) => {
      // The page's <main>, or (on the few app pages without one) its first heading.
      const target = document.querySelector("main") ?? document.querySelector("h1, h2");
      e.preventDefault();
      if (!(target instanceof HTMLElement)) return;
      target.setAttribute("tabindex", "-1");
      target.focus();
      target.scrollIntoView({ block: "start" });
    }}
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
  >
    Skip to content
  </a>
);

export default SkipLink;
