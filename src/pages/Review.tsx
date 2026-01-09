import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { toast } from "sonner";

const Review = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rating: 0,
    review: "",
  });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const formAnimation = useScrollAnimation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.rating || !formData.review) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Simulate submission (you can connect this to a backend later)
    console.log("Review submitted:", formData);
    setSubmitted(true);
    
    toast.success("Your review has been submitted successfully — thank you for supporting La Rosa View!");
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", rating: 0, review: "" });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(103, 232, 249, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0))"}
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-16 px-6">
        <div 
          ref={formAnimation.ref}
          className={`container mx-auto max-w-2xl transition-all duration-700 ${
            formAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {!submitted ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:shadow-xl hover:shadow-rose-600/20">
              <CardHeader className="text-center space-y-4 pb-6">
                <CardTitle className="text-3xl md:text-4xl font-bold">
                  <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
                    Leave a Review
                  </span>
                </CardTitle>
                <p className="text-muted-foreground">
                  Share your experience with La Rosa View — your feedback means the world to us
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-background/50"
                      required
                    />
                  </div>

                  {/* Email (Optional) */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>

                  {/* Rating */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Rating <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className="transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= (hoveredStar || formData.rating)
                                ? "fill-rose-500 text-rose-500"
                                : "text-muted-foreground"
                            } transition-colors`}
                          />
                        </button>
                      ))}
                      {formData.rating > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({formData.rating} star{formData.rating !== 1 ? "s" : ""})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review */}
                  <div className="space-y-2">
                    <label htmlFor="review" className="text-sm font-medium">
                      Your Review <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      id="review"
                      placeholder="Tell us about your experience with La Rosa View..."
                      value={formData.review}
                      onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                      className="bg-background/50 min-h-[150px] resize-none"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105"
                  >
                    Submit Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-rose-500/50 bg-card/50 backdrop-blur shadow-xl shadow-rose-600/20">
              <CardContent className="py-16 text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Star className="w-10 h-10 fill-rose-500 text-rose-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-rose-400">
                  Thank You!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your review has been submitted successfully — thank you for supporting La Rosa View!
                </p>
                <Link to="/">
                  <Button variant="outline" className="border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500">
                    Return Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Review;
