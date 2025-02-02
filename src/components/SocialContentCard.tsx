import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Mail, MessageSquare, Clock, AlertCircle, Globe, Linkedin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Json } from "@/integrations/supabase/types";

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
    processed: boolean;
    error_message?: string | null;
    url_title?: string | null;
    url_content?: string | null;
    url_author?: string | null;
    url_published_at?: string | null;
    source_platform?: string | null;
    platform_post_id?: string | null;
    platform_specific_data?: Json | null;
  };
}

const SocialContentCard = ({ content }: SocialContentCardProps) => {
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-lg font-medium">
            {content.url_title || content.content_title || "Untitled Content"}
          </CardTitle>
          <Badge variant={content.processed ? "default" : "secondary"} className="ml-2">
            <span className="flex items-center gap-1">
              {getSourceIcon(content.source_platform || content.source_type)}
              {content.source_platform || content.source_type}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {content.error_message && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {content.error_message}
            </div>
          )}
          
          {(content.url_content || content.content_body) && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {content.url_content || content.content_body}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {(content.url_author || content.original_author) && (
              <span className="flex items-center gap-1">
                By: {content.url_author || content.original_author}
              </span>
            )}
            
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {content.url_published_at 
                ? formatDistanceToNow(new Date(content.url_published_at), { addSuffix: true })
                : content.source_created_at 
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