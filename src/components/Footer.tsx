import { Linkedin, Palette, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 px-6 border-t border-border/40">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-muted-foreground">
          <p>© 2025 Houcine.world — All Rights Reserved</p>
          <div className="flex items-center gap-4">
            <a 
              href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
            >
              <Linkedin className="h-6 w-6" />
            </a>
            <a 
              href="https://www.behance.net/HoucineDesigns" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
            >
              <Palette className="h-6 w-6" />
            </a>
            <a 
              href="https://github.com/HoucineMohamed" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-accent transition-all hover:scale-110 duration-200"
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
