import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SocialContentCard from "./SocialContentCard";
import { Loader2 } from "lucide-react";

const SocialContentList = () => {
  const { data: socialContent, isLoading, error } = useQuery({
    queryKey: ['socialContent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_content_ingests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading content: {error.message}
      </div>
    );
  }

  if (!socialContent?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No content found. Start by sharing content to your ingest email!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {socialContent.map((content) => (
        <SocialContentCard key={content.id} content={content} />
      ))}
    </div>
  );
};

export default SocialContentList;