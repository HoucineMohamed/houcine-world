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
      <CardHeader className="p-2 sm:p-4 md:p-6">
        <div className="relative mb-2 sm:mb-4 overflow-hidden rounded-lg">
          <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <img 
              src={book.coverImage} 
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          {book.isNew && (
            <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              New
            </Badge>
          )}
          {book.isBestseller && (
            <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-accent text-accent-foreground text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              Bestseller
            </Badge>
          )}
        </div>
        <div className="space-y-1 sm:space-y-2">
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {book.category}
          </Badge>
          <CardTitle className="text-sm sm:text-lg md:text-xl line-clamp-2">{book.title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            by {book.author}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between p-2 sm:p-4 md:p-6 pt-0">
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-3 hidden sm:block">
          {book.shortDescription}
        </p>
        
        <div className="space-y-2 sm:space-y-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold">{book.rating}</span>
            </div>
            <span className="text-muted-foreground hidden sm:inline">({book.reviewCount} reviews)</span>
          </div>

          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl md:text-3xl font-bold text-primary">
              {currency === "EUR" ? "€" : currency === "USD" ? "$" : ""}
              {convertPrice(book.basePrice)}
              {currency === "TND" && <span className="text-xs sm:text-sm ml-0.5">TND</span>}
            </span>
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-xs sm:text-sm py-1.5 sm:py-2"
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
