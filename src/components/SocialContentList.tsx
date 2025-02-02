import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import SocialContentCard from "./SocialContentCard";
import { toast } from "sonner";

const SocialContentList = () => {
  const { data: socialContent, isLoading, error, refetch } = useQuery({
    queryKey: ['socialContent'],
    queryFn: async () => {
      console.log("Fetching social content");
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        console.error("No authenticated user found");
        throw new Error("No authenticated user");
      }
      
      console.log("Authenticated user ID:", session.session.user.id);
      
      const { data, error } = await supabase
        .from('ingest_content_feb')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });
      
      console.log("Supabase query response:", { data, error });
      
      if (error) {
        console.error("Supabase query error:", error);
        toast.error("Failed to fetch content");
        throw error;
      }
      
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds to check for new content
  });

  if (isLoading) {
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
        <p>Error loading content: {error.message}</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 text-primary hover:underline"
        >
          Try again
        </button>
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
        <SocialContentCard
          key={content.id}
          content={content}
        />
      ))}
    </div>
  );
};

export default SocialContentList;