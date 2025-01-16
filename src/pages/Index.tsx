import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import PostList from "@/components/PostList";
import DigestList from "@/components/DigestList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, List, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Summary {
  summary_content: string | null;
  status: string;
  error_message: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author?: string;
  subreddit?: string;
  url: string;
  summaries?: Summary[];
}

const Index = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const { session, isLoading, error } = useSessionContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/auth");
    }
  }, [session, isLoading, navigate]);

  useEffect(() => {
    const fetchPosts = async () => {
      console.log("Fetching posts...");
      try {
        const { data: postsData, error: postsError } = await supabase
          .from("fetched_posts")
          .select(`
            *,
            summaries (
              summary_content,
              status,
              error_message
            )
          `);

        console.log("Fetch response:", { postsData, postsError });

        if (postsError) {
          throw postsError;
        }

        setPosts(postsData || []);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch posts. Please try again later.",
        });
      }
    };

    if (session) {
      fetchPosts();
    }
  }, [session, toast]);

  const handleGenerateAI = async (postId: string, enabled: boolean) => {
    if (!enabled) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Post not found.",
        });
        return;
      }

      const { error: invokeError } = await supabase.functions.invoke("generate-summary", {
        body: { postId, contentLength: post.content.length },
      });

      if (invokeError) throw invokeError;

      // Refetch posts to get updated summaries
      const { data: updatedPost, error: fetchError } = await supabase
        .from("fetched_posts")
        .select(`
          *,
          summaries (
            summary_content,
            status,
            error_message
          )
        `)
        .eq("id", postId)
        .single();

      if (fetchError) throw fetchError;

      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postId ? updatedPost : p))
      );
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate summary. Please try again later.",
      });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-destructive mb-4">Error: {error.message}</p>
        <button
          onClick={() => navigate("/auth")}
          className="text-primary hover:underline"
        >
          Return to login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Tabs defaultValue="posts">
        <TabsList className="mb-8">
          <TabsTrigger value="posts" className="space-x-2">
            <List className="w-4 h-4" />
            <span>Posts</span>
          </TabsTrigger>
          <TabsTrigger value="digests" className="space-x-2">
            <ScrollText className="w-4 h-4" />
            <span>My Digests</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostList posts={posts} onGenerateAI={handleGenerateAI} />
        </TabsContent>
        <TabsContent value="digests">
          <DigestList posts={posts} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;