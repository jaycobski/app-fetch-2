import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Index = () => {
  const navigate = useNavigate();

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

  useEffect(() => {
    console.log("Index page mounted");
    
    const checkAuth = async () => {
      console.log("Checking authentication...");
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("Auth check result:", { session, error });
      
      if (!session) {
        console.log("No session found, redirecting to /auth");
        navigate("/auth");
      } else if (ingestEmail?.email_address) {
        toast.success(
          "Welcome! Your content sharing email is ready.",
          {
            description: "Use this email to automatically save content from your favorite platforms. You can always find it in your dashboard.",
            duration: 6000,
          }
        );
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
  }, [navigate, ingestEmail]);

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

  if (emailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
              You can always find this email in your dashboard.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-center text-muted-foreground mt-8">
        Start sharing content by sending it to your unique email address above.
      </div>
    </div>
  );
};

export default Index;