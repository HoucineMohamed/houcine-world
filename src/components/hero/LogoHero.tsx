import { useEffect, useState } from "react";
import logoH from "@/assets/logo-h.png";

// A living, dimensional treatment of the official Houcine.world logo (the homepage hero's
// centerpiece). Pure CSS 3D -- perspective + preserve-3d -- no WebGL, no new dependency, and no
// continuous spin: a slow choreographed scale/position drift (index.css, .animate-logo-drift) plus,
// on desktop, a gentle pointer-driven tilt on a separate nested layer so the two transforms don't
// collide. prefers-reduced-motion and touch devices get the still, well-lit composition instead.

const checkReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const checkIsTouch = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

export default function LogoHero() {
  const [reducedMotion, setReducedMotion] = useState(checkReducedMotion);
  const [isTouch, setIsTouch] = useState(checkIsTouch);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onResize = () => setIsTouch(checkIsTouch());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setLoaded(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (reducedMotion || isTouch) return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setTilt({
        x: ((e.clientX - cx) / cx) * 10,
        y: ((cy - e.clientY) / cy) * 8,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reducedMotion, isTouch]);

  const still = reducedMotion;

  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ perspective: "1400px", width: "min(78vw, 480px)", aspectRatio: "1 / 1" }}
      aria-hidden="true"
    >
      {/* Ambient light field behind the logo -- the scene's one light source */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 42%, hsl(var(--accent) / 0.35) 0%, hsl(var(--accent) / 0.12) 38%, transparent 72%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className={`relative w-full h-full transition-opacity duration-[1400ms] ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        } ${still ? "" : "animate-logo-drift"}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transform: still ? "none" : `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <img
            src={logoH}
            alt=""
            draggable={false}
            className="w-full h-full object-contain select-none"
            style={{
              filter:
                "drop-shadow(0 30px 55px hsl(var(--background))) drop-shadow(0 0 45px hsl(var(--accent) / 0.25))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
