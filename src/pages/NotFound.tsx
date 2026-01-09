import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <ScrollProgressBar />
      <CustomCursor />
      
      <div className="text-center px-6 max-w-2xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <div className="text-9xl font-bold bg-gradient-to-r from-accent via-tech-blue to-accent bg-clip-text text-transparent mb-4">
            404
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Page Not Found</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-12 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(103, 232, 249, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0))"}
            />
          </Link>
          <Link to="/">
            <Button className="gap-2 hover:scale-105 transition-all">
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
