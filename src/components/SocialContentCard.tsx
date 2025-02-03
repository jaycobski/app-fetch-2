import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Json } from "@/integrations/supabase/types";
import CardHeaderContent from "./social/CardHeader";
import CardMainContent from "./social/CardContent";
import CardFooter from "./social/CardFooter";

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
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardHeaderContent
          title={content.url_title || content.content_title || "Untitled Content"}
          sourceType={content.source_type}
          sourcePlatform={content.source_platform}
        />
      </CardHeader>
      <CardContent>
        <CardMainContent
          errorMessage={content.error_message}
          content={content.url_content || content.content_body}
        />
        <div className="mt-4">
          <CardFooter
            author={content.url_author || content.original_author}
            publishedAt={content.url_published_at}
            sourceCreatedAt={content.source_created_at}
            createdAt={content.created_at}
            originalUrl={content.original_url}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialContentCard;