import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
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
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="gap-2 hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="gap-2 hover:scale-105 transition-all w-full sm:w-auto">
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
