import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

export interface Testimonial {
  id: number;
  name: string;
  comment: string;
  rating: number;
}

const initialTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    comment: "Working with Houcine was an incredible experience. The visuals, strategy, and storytelling were perfectly aligned — turning our brand into something truly memorable.",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    comment: "Exceptional design work that exceeded our expectations. Houcine's attention to detail and creative vision brought our project to life in ways we never imagined.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emma Williams",
    comment: "A true professional with an eye for aesthetics. The branding package we received was comprehensive, modern, and perfectly captured our company's essence.",
    rating: 5,
  },
];

interface TestimonialsSliderProps {
  testimonials?: Testimonial[];
}

export const TestimonialsSlider = ({ testimonials: externalTestimonials }: TestimonialsSliderProps = {}) => {
  const testimonials = externalTestimonials || initialTestimonials;
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="relative max-w-4xl mx-auto">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-8">
          <div className="flex items-center justify-center mb-4">
            {[...Array(currentTestimonial.rating)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-accent text-accent" />
            ))}
          </div>
          <p className="text-lg text-center mb-6 text-foreground italic">
            "{currentTestimonial.comment}"
          </p>
          <p className="text-center text-accent font-semibold">
            — {currentTestimonial.name}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={prevTestimonial}
          disabled={testimonials.length <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-accent w-8" : "bg-border"
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={nextTestimonial}
          disabled={testimonials.length <= 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
