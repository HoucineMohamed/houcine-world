import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, ExternalLink, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

interface BakchichProduct {
  id: number;
  name: string;
  price: string;
  image_url: string;
  url: string;
}

const Reads = () => {
  const [products, setProducts] = useState<BakchichProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Note: Bakchich doesn't provide a public API, so products would need to be manually curated
  // or fetched through a backend proxy. For now, showing the store link prominently.

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
          
          <p className="text-xl text-muted-foreground mb-8">
            A curated collection of books and merchandise for curious minds.
          </p>

          <div className="mb-12">
            <a
              href="https://ba9chich.com/fr/Mohamed.Houcine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Card className="border-accent/50 bg-card/50 backdrop-blur hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                      <CardTitle className="text-2xl group-hover:text-accent transition-colors">Visit My Bakchich Store</CardTitle>
                      <CardDescription className="mt-2">
                        Browse books and exclusive merchandise
                      </CardDescription>
                    </div>
                    <ExternalLink className="w-6 h-6 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Discover a curated collection of books, learning materials, and exclusive items on my Bakchich store.
                  </p>
                  <Button variant="default" className="gap-2">
                    Shop Now
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </a>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>More Coming Soon</CardTitle>
              <CardDescription>
                Additional books and digital resources will be added regularly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Check back often or visit the Bakchich store to see the latest additions to the collection.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Reads;
