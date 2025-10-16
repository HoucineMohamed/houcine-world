import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Reads = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <BookOpen className="w-12 h-12 text-accent" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Houcine.reads</h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-12">
            A curated digital bookstore for learners — coming soon.
          </p>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Digital Library Coming Soon</CardTitle>
              <CardDescription>
                This section will feature curated books and learning resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Stay tuned for carefully selected digital books and educational materials for curious minds.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reads;
