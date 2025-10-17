import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, GitFork, ExternalLink, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
}

const Dev = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch('https://api.github.com/users/HoucineMohamed/repos?sort=updated&per_page=100');
        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }
        const data = await response.json();
        setRepos(data);
        setError(null);
      } catch (err) {
        setError('Unable to load projects. Please try again later.');
        console.error('Error fetching repos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Houcine.dev</h1>
          <p className="text-xl text-muted-foreground">
            Explore my development projects and open-source contributions from GitHub
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-tech-blue" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && repos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No projects found yet. Check back soon!</p>
          </div>
        )}

        {!loading && !error && repos.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/50 hover:shadow-lg hover:shadow-tech-blue/20 transition-all duration-300 group cursor-pointer hover:scale-[1.02]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:text-tech-blue transition-colors">
                          {repo.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {repo.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-tech-blue transition-colors ml-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {repo.stargazers_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <GitFork className="w-4 h-4" />
                          {repo.forks_count}
                        </div>
                        {repo.language && (
                          <Badge variant="secondary" className="text-xs">
                            {repo.language}
                          </Badge>
                        )}
                      </div>

                      {/* Topics */}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {repo.topics.slice(0, 5).map((topic) => (
                            <Badge key={topic} variant="outline" className="text-xs border-tech-blue/30">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Updated date */}
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(repo.updated_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Dev;
