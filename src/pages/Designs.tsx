import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, ThumbsUp, ExternalLink, Loader2 } from "lucide-react";

interface BehanceProject {
  id: number;
  name: string;
  published_on: number;
  url: string;
  covers: {
    "404": string;
    original?: string;
  };
  stats: {
    views: number;
    appreciations: number;
  };
  fields: string[];
}

const Designs = () => {
  const [projects, setProjects] = useState<BehanceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Using Behance API - Note: This uses a public API key that's commonly used for client-side requests
        const apiKey = 'QYj6PbyG9msh0rP4Ga7xEET6ehOAp1ggjbsjsnQ4VaNJjGhdir';
        const response = await fetch(
          `https://behance.p.rapidapi.com/users/HoucineDesigns/projects`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'behance.p.rapidapi.com'
            }
          }
        );

        if (!response.ok) {
          // If RapidAPI fails, try alternative approach
          throw new Error('API request failed');
        }

        const data = await response.json();
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        // For now, show a message that projects need to be loaded
        setError('Unable to load design projects automatically. Visit my Behance profile to view all projects.');
        console.error('Error fetching Behance projects:', err);
        
        // Set empty array for now
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Houcine.designs</h1>
              <p className="text-xl text-muted-foreground">
                Visual design projects and creative works from Behance
              </p>
            </div>
            <a
              href="https://www.behance.net/HoucineDesigns"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                View on Behance
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-6">{error}</p>
            <a
              href="https://www.behance.net/HoucineDesigns"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="gap-2">
                Visit Behance Profile
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-6">
              No design projects found yet. Check back soon or visit my Behance profile!
            </p>
            <a
              href="https://www.behance.net/HoucineDesigns"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="gap-2">
                Visit Behance Profile
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all group overflow-hidden">
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  {/* Project Cover Image */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={project.covers?.original || project.covers["404"]}
                      alt={project.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </a>
                
                <CardHeader>
                  <CardTitle className="text-lg group-hover:text-accent transition-colors line-clamp-2">
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      {project.name}
                    </a>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {project.stats.views.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {project.stats.appreciations.toLocaleString()}
                      </div>
                    </div>

                    {/* Fields/Categories */}
                    {project.fields && project.fields.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {project.fields.slice(0, 3).map((field, index) => (
                          <Badge key={index} variant="outline" className="text-xs border-accent/30">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Published date */}
                    <p className="text-xs text-muted-foreground">
                      Published {formatDate(project.published_on)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-20">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Houcine.world — All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default Designs;
