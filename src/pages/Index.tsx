import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import PostList from "@/components/PostList";
import DigestList from "@/components/DigestList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, List } from "lucide-react";

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
  const { session, isLoading } = useSessionContext();
  const navigate = useNavigate();

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
      }
    };

    if (session) {
      fetchPosts();
    }
  }, [session]);

  const handleGenerateAI = async (postId: string, enabled: boolean) => {
    if (!enabled) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const { error } = await supabase.functions.invoke("generate-summary", {
        body: { postId, contentLength: post.content.length },
      });

      if (error) throw error;

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
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
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