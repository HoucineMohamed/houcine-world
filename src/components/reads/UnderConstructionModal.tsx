import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Construction, Clock } from "lucide-react";

interface UnderConstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle?: string;
}

const UnderConstructionModal = ({ isOpen, onClose, bookTitle }: UnderConstructionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Construction className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl font-display">
            Store Under Construction
          </DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <p className="text-muted-foreground">
              Houcine.education is currently being prepared for launch.
            </p>
            {bookTitle && (
              <p className="text-sm text-muted-foreground">
                You selected: <span className="text-foreground font-medium">{bookTitle}</span>
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Clock className="w-4 h-4" />
              <span>Purchases will be available soon</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} variant="outline">
            Got it, I'll wait
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnderConstructionModal;
