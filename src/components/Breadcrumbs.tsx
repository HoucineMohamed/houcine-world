import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { breadcrumbTrail } from "@/routes/breadcrumbs";

// "Home › Work › This case study" above a public page's content. The trail comes from the route manifest
// (src/routes/breadcrumbs.ts); a page with no trail (home, unknown, private) shows nothing.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const Breadcrumbs = ({ className }: { className?: string }) => {
  const { pathname } = useLocation();
  const trail = breadcrumbTrail(pathname);
  if (!trail) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("print:hidden", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <Fragment key={c.path}>
              <li className="min-w-0">
                {last ? (
                  <span aria-current="page" className="text-foreground break-words">
                    {c.label}
                  </span>
                ) : (
                  <Link
                    to={c.path}
                    className={cn("inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 rounded hover:text-foreground transition-colors", focusRing)}
                  >
                    {c.label}
                  </Link>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="flex items-center">
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
