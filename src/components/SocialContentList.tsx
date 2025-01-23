import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import SocialContentCard from "./SocialContentCard";

const SocialContentList = () => {
  console.log("SocialContentList component rendering");
  
  const { data: socialContent, isLoading, error } = useQuery({
    queryKey: ['socialContent'],
    queryFn: async () => {
      console.log("Fetching social content");
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        throw new Error("No authenticated user");
      }
      
      const { data, error } = await supabase
        .from('social_content_ingests')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });
      
      console.log("Supabase response:", { data, error });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    console.log("SocialContentList is loading");
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    console.error("SocialContentList error:", error);
    return (
      <div className="text-center py-8 text-destructive">
        Error loading content: {error.message}
      </div>
    );
  }

  if (!socialContent?.length) {
    console.log("No social content found");
    return (
      <div className="text-center py-8 text-muted-foreground">
        No content found. Start by sharing content to your ingest email!
      </div>
    );
  }

  console.log("Rendering social content:", socialContent);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {socialContent.map((content) => (
        <SocialContentCard
          key={content.id}
          content={content}
        />
      ))}
    </div>
  );
};

export default SocialContentList;