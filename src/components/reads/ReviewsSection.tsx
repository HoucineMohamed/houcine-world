import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

const ReviewsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: "1",
      name: "Sarah Johnson",
      rating: 5,
      comment: "Exceptional content! The FinTech Foundations book transformed my understanding of digital banking.",
      date: "2024-01-15"
    },
    {
      id: "2",
      name: "Ahmed Ben Ali",
      rating: 5,
      comment: "Clear, practical, and well-structured. Perfect for professionals entering the FinTech space.",
      date: "2024-01-10"
    },
    {
      id: "3",
      name: "Maria Garcia",
      rating: 4,
      comment: "Great resource for learning React. The examples are practical and easy to follow.",
      date: "2024-01-08"
    }
  ]);

  const [newReview, setNewReview] = useState({
    name: "",
    rating: 5,
    comment: ""
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name || !newReview.comment) {
      toast.error("Please fill in all fields");
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      name: newReview.name,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews([review, ...reviews]);
    setNewReview({ name: "", rating: 5, comment: "" });
    toast.success("Review submitted successfully!");
  };

  return (
    <div className="space-y-12">
      {/* Existing Reviews */}
      <div>
        <h3 className="text-2xl font-display font-bold mb-6 text-center">What Readers Say</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.slice(0, 3).map((review) => (
            <Card key={review.id} className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">{review.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating 
                            ? "fill-yellow-500 text-yellow-500" 
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <CardDescription className="text-xs">{review.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Leave a Review Form */}
      <Card className="border-border/50 bg-card/50 backdrop-blur max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Leave a Review</CardTitle>
          <CardDescription>Share your experience with our books</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input 
                value={newReview.name}
                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        rating <= newReview.rating 
                          ? "fill-yellow-500 text-yellow-500" 
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Review</label>
              <Textarea 
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Share your thoughts about the book..."
                rows={4}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Submit Review
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewsSection;
