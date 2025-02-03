import { Card } from "@/components/ui/card";
import { useSocialContent } from "@/hooks/useSocialContent";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import CardHeader from "./CardHeader";
import CardContent from "./CardContent";
import CardFooter from "./CardFooter";

const SocialContentList = () => {
  const { data: content, isLoading, error } = useSocialContent();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  if (!content?.length) {
    return (
      <div className="text-center text-muted-foreground">
        No content found. Share some content to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content.map((item) => (
        <Card key={item.id} className="p-6">
          <CardHeader 
            title={item.content_title || item.url_title || 'Untitled'} 
            sourceType={item.source_type}
            sourcePlatform={item.source_platform}
          />
          
          <CardContent 
            errorMessage={item.error_message}
            content={item.content_body || item.url_content}
          />
          
          <CardFooter 
            author={item.original_author || item.url_author}
            publishedAt={item.url_published_at}
            sourceCreatedAt={item.source_created_at}
            createdAt={item.created_at}
            originalUrl={item.original_url}
          />
        </Card>
      ))}
    </div>
  );
};

export default SocialContentList;