import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PostList from "@/components/PostList";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["fetched-posts"],
    queryFn: async () => {
      console.log("Fetching posts...");
      const { data, error } = await supabase
        .from("fetched_posts")
        .select("*")
        .order("created_at", { ascending: false });
      
      console.log("Fetch response:", { data, error });
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      return data;
    },
  });

  const handleGenerateAI = async (postId: string, enabled: boolean) => {
    if (enabled) {
      const toastId = toast.loading("Generating AI overview...");
      try {
        const post = posts?.find(p => p.id === postId);
        if (!post) throw new Error("Post not found");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session found");

        // Use supabase.functions.invoke instead of fetch
        const { data, error } = await supabase.functions.invoke('generate-summary', {
          body: {
            postId,
            content: post.content
          }
        });

        console.log('Edge function response:', { data, error });

        if (error) {
          throw new Error(error.message || 'Failed to generate summary');
        }

        if (!data) {
          throw new Error('No data received from summary generation');
        }
        
        toast.success("AI overview generated successfully!", { id: toastId });
      } catch (err) {
        console.error('Error generating AI overview:', err);
        toast.error(`Failed to generate AI overview: ${err.message}`, { id: toastId });
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error loading posts: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Fetched Posts</h1>
        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
      </div>
      
      <PostList posts={posts || []} onGenerateAI={handleGenerateAI} />
    </div>
  );
};

export default Index;