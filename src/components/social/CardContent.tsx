import { AlertCircle } from "lucide-react";

interface CardContentProps {
  errorMessage?: string | null;
  content?: string | null;
}

const CardContent = ({ errorMessage, content }: CardContentProps) => {
  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}
      
      {content && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {content}
        </p>
      )}
    </div>
  );
};

export default CardContent;