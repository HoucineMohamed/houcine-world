import { Linkedin, Palette, Github } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";

const Footer = () => {
  return (
    <footer className="py-8 px-6 border-t border-border/40">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-muted-foreground">
          <p>© 2025 Houcine.world — All Rights Reserved</p>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="hover:scale-110 transition-all duration-200 group"
              aria-label="Houcine.world home"
            >
              <img 
                src={logoH} 
                alt="Houcine.world logo" 
                className="h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0))";
                }}
              />
            </Link>
            <a 
              href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="h-6 w-6" />
            </a>
            <a 
              href="https://www.behance.net/HoucineDesigns" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
              aria-label="Behance portfolio"
            >
              <Palette className="h-6 w-6" />
            </a>
            <a 
              href="https://github.com/HoucineMohamed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
              aria-label="GitHub profile"
            >
              <Github className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
