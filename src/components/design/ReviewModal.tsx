import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: { name: string; rating: number; comment: string }) => void;
}

export const ReviewModal = ({ isOpen, onClose, onSubmit }: ReviewModalProps) => {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rating || !comment) {
      return;
    }
    onSubmit({ name, rating, comment });
    // Reset form
    setName("");
    setRating(0);
    setHoveredRating(0);
    setComment("");
    onClose();
  };

  const handleCancel = () => {
    setName("");
    setRating(0);
    setHoveredRating(0);
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Leave a Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <Label htmlFor="review-name">Name *</Label>
            <Input
              id="review-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label>Rating *</Label>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review-comment">Your Review *</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={5}
              required
              className="mt-2"
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              Send Review
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
