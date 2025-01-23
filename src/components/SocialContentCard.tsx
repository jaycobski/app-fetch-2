import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Mail, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SocialContentCardProps {
  content: {
    id: string;
    source_type: string;
    content_title?: string | null;
    content_body?: string | null;
    original_url?: string | null;
    original_author?: string | null;
    source_created_at?: string | null;
    created_at: string;
  };
}

const SocialContentCard = ({ content }: SocialContentCardProps) => {
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-lg font-medium">
            {content.content_title || "Untitled Content"}
          </CardTitle>
          <Badge variant="outline" className="ml-2">
            <span className="flex items-center gap-1">
              {getSourceIcon(content.source_type)}
              {content.source_type}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {content.content_body && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {content.content_body}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {content.original_author && (
              <span className="flex items-center gap-1">
                By: {content.original_author}
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {content.source_created_at 
                ? formatDistanceToNow(new Date(content.source_created_at), { addSuffix: true })
                : formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
            </span>
            
            {content.original_url && (
              <a
                href={content.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Original
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialContentCard;