import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import PostList from "@/components/PostList";
import DigestList from "@/components/DigestList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, List, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const { session, isLoading: isLoadingSession } = useSessionContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingSession && !session) {
      navigate("/auth");
      return;
    }

    const fetchPosts = async () => {
      if (!session) return;
      
      setIsLoadingPosts(true);
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
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [session, isLoadingSession, navigate, toast]);

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

  // Only show loading spinner while checking session
  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Show content or posts loading state
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
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading posts...</span>
              </div>
            </div>
          ) : (
            <PostList posts={posts} onGenerateAI={handleGenerateAI} />
          )}
        </TabsContent>
        <TabsContent value="digests">
          <DigestList posts={posts} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;