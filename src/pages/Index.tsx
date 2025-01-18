import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PostList from "@/components/PostList";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Index page mounted");
    
    const checkAuth = async () => {
      console.log("Checking authentication...");
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Auth check result:", { session, error });
      if (!session) {
        console.log("No session found, redirecting to /auth");
        navigate("/auth");
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed in Index:", { event, session });
      if (!session) {
        console.log("Session ended, redirecting to /auth");
        navigate("/auth");
      }
    });

    return () => {
      console.log("Index page unmounting, cleaning up subscription");
      subscription.unsubscribe();
    };
  }, [navigate]);

  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ["fetched-posts"],
    queryFn: async () => {
      console.log("Fetching posts...");
      const { data: postsData, error: postsError } = await supabase
        .from("fetched_posts")
        .select(`
          *,
          summaries (
            summary_content,
            status,
            error_message
          )
        `)
        .order("created_at", { ascending: false });
      
      console.log("Fetch response:", { postsData, postsError });
      
      if (postsError) {
        console.error("Supabase error:", postsError);
        throw postsError;
      }
      return postsData;
    },
  });

  const { data: ingestEmail, isLoading: emailLoading } = useQuery({
    queryKey: ['ingestEmail'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_ingest_emails')
        .select('email_address')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const copyEmailToClipboard = async () => {
    if (ingestEmail?.email_address) {
      try {
        await navigator.clipboard.writeText(ingestEmail.email_address);
        toast.success("Email address copied to clipboard");
      } catch (err) {
        console.error("Failed to copy email:", err);
        toast.error("Failed to copy email address");
      }
    }
  };

  const handleGenerateAI = async (postId: string, enabled: boolean) => {
    if (enabled) {
      const toastId = toast.loading("Generating AI overview...");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("No active session found");
        }

        const post = posts?.find(p => p.id === postId);
        if (!post) throw new Error("Post not found");

        console.log("Invoking edge function with session token:", {
          postId,
          contentLength: post.content?.length || 0,
        });

        const { data, error } = await supabase.functions.invoke('generate-summary', {
          body: {
            postId,
            content: post.content
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
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
    console.log("Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } else {
      console.log("Successfully signed out");
    }
  };

  if (postsLoading || emailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (postsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error loading posts: {postsError.message}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Fetched Posts</h1>
        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
      </div>

      {ingestEmail?.email_address && (
        <Alert className="mb-8">
          <AlertDescription>
            <div className="flex items-center justify-between gap-2">
              <div className="break-all">
                <span className="font-medium">Your content sharing email:</span>
                <br />
                {ingestEmail.email_address}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyEmailToClipboard}
              >
                Copy
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share content to this email address to automatically save it to your account.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <PostList posts={posts || []} onGenerateAI={handleGenerateAI} />
    </div>
  );
};

export default Index;