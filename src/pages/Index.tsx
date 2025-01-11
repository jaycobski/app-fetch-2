import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
        // Find the post content
        const post = posts?.find(p => p.id === postId);
        if (!post) throw new Error("Post not found");

        // Call Perplexity API via Supabase Edge Function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session found");

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that creates concise summaries of content. Keep summaries under 3 sentences.'
              },
              {
                role: 'user',
                content: `Please summarize this content: ${post.content}`
              }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            return_images: false,
            return_related_questions: false,
            frequency_penalty: 1
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate summary');
        }

        const result = await response.json();
        const summary = result.choices[0].message.content;

        // Store the summary in Supabase
        const { error: summaryError } = await supabase
          .from('summaries')
          .insert({
            user_id: session.user.id,
            post_id: postId,
            content: summary,
            status: 'completed'
          });

        if (summaryError) throw summaryError;

        toast.success("AI overview generated successfully!", { id: toastId });
      } catch (err) {
        console.error('Error generating AI overview:', err);
        toast.error("Failed to generate AI overview", { id: toastId });
      }
    }
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts?.map((post) => (
          <Card key={post.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-lg line-clamp-1">{post.title || "Untitled Post"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {post.content && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {post.author && <span>By: {post.author}</span>}
                  {post.subreddit && <span>r/{post.subreddit}</span>}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    View Original
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Generate AI Overview</span>
                    <Switch
                      onCheckedChange={(checked) => handleGenerateAI(post.id, checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {posts?.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No posts found. Start by fetching some posts!
        </div>
      )}
    </div>
  );
};

export default Index;