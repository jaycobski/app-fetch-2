import { Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CardFooterProps {
  author?: string | null;
  publishedAt?: string | null;
  sourceCreatedAt?: string | null;
  createdAt: string;
  originalUrl?: string | null;
}

const CardFooter = ({ 
  author, 
  publishedAt, 
  sourceCreatedAt, 
  createdAt, 
  originalUrl 
}: CardFooterProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {author && (
        <span className="flex items-center gap-1">
          By: {author}
        </span>
      )}
      
      <span className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        {publishedAt 
          ? formatDistanceToNow(new Date(publishedAt), { addSuffix: true })
          : sourceCreatedAt 
            ? formatDistanceToNow(new Date(sourceCreatedAt), { addSuffix: true })
            : formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </span>
      
      {originalUrl && (
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          View Original
        </a>
      )}
    </div>
  );
};

export default CardFooter;