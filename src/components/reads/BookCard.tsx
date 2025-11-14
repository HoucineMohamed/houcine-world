import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Book } from "@/data/booksData";

interface BookCardProps {
  book: Book;
  onBuyNow: (book: Book) => void;
}

const BookCard = ({ book, onBuyNow }: BookCardProps) => {
  const { currency, convertPrice } = useCurrency();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group hover:scale-[1.02] h-full flex flex-col">
      <CardHeader>
        <div className="relative mb-4 overflow-hidden rounded-lg">
          <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <img 
              src={book.coverImage} 
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          {book.isNew && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              New
            </Badge>
          )}
          {book.isBestseller && (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
              Bestseller
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs">
            {book.category}
          </Badge>
          <CardTitle className="text-xl line-clamp-2">{book.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            by {book.author}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {book.shortDescription}
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold">{book.rating}</span>
            </div>
            <span className="text-muted-foreground">({book.reviewCount} reviews)</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {currency === "EUR" ? "€" : currency === "USD" ? "$" : "TND "}
              {convertPrice(book.basePrice)}
            </span>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => onBuyNow(book)}
          >
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookCard;
