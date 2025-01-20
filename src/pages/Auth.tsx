import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AuthError } from "@supabase/supabase-js";
import { useQuery, useMutation } from "@tanstack/react-query";

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    console.log("Auth page mounted");
    
    const checkInitialSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      console.log("Initial session check:", { currentSession, error });
      if (currentSession) {
        console.log("User already has a session, redirecting to /");
        setSession(currentSession);
        navigate("/");
      }
    };
    
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("Auth state changed:", { event, currentSession });
      if (event === "SIGNED_IN" && currentSession) {
        console.log("User signed in, redirecting to /");
        setSession(currentSession);
        navigate("/");
      }
    });

    return () => {
      console.log("Auth page unmounting, cleaning up subscription");
      subscription.unsubscribe();
    };
  }, [navigate]);

  const { data: ingestEmail, isError, refetch } = useQuery({
    queryKey: ['ingestEmail', session?.user?.id],
    queryFn: async () => {
      console.log("Fetching ingest email for user:", session?.user?.id);
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('user_ingest_emails')
        .select('email_address, cloudmailin_target, cloudmailin_username, cloudmailin_password')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      console.log("Ingest email query result:", { data, error });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const updateCloudMailinSettings = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("No user session");
      
      // Generate random username and password for CloudMailin
      const username = `user_${Math.random().toString(36).substring(2, 15)}`;
      const password = Math.random().toString(36).substring(2, 15);
      
      // Use the correct CloudMailin HTTP POST URL format
      const target = `https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/process-inbound-email`;
      
      const { data, error } = await supabase
        .from('user_ingest_emails')
        .update({
          cloudmailin_target: target,
          cloudmailin_username: username,
          cloudmailin_password: password,
        })
        .eq('user_id', session.user.id)
        .select()
        .single();
      
      if (error) throw error;

      // After updating the database, make the API call to CloudMailin
      const cloudMailinResponse = await fetch('https://api.cloudmailin.com/api/v0.1/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: You'll need to add this secret
          'Authorization': `Token token=${process.env.CLOUDMAILIN_API_KEY}`,
        },
        body: JSON.stringify({
          address: {
            email: data.email_address,
            target_url: target,
            http_username: username,
            http_password: password,
            format: 'json'
          }
        })
      });

      if (!cloudMailinResponse.ok) {
        throw new Error('Failed to configure CloudMailin');
      }

      return data;
    },
    onSuccess: () => {
      toast({
        description: "CloudMailin settings updated successfully",
      });
      refetch(); // Refresh the ingest email data
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Failed to update CloudMailin settings: " + error.message,
      });
    },
  });

  const copyEmailToClipboard = async () => {
    if (ingestEmail?.email_address) {
      try {
        await navigator.clipboard.writeText(ingestEmail.email_address);
        toast({
          description: "Email address copied to clipboard",
        });
      } catch (err) {
        console.error("Failed to copy email:", err);
        toast({
          variant: "destructive",
          description: "Failed to copy email address",
        });
      }
    }
  };

  const getErrorMessage = (error: AuthError) => {
    switch (error.message) {
      case "Invalid login credentials":
        return "Invalid email or password. Please check your credentials and try again.";
      case "Email not confirmed":
        return "Please verify your email address before signing in.";
      case "User not found":
        return "No user found with these credentials.";
      default:
        return error.message;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>
        
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {session && ingestEmail?.email_address && (
          <>
            <Alert>
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

            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">CloudMailin Configuration</div>
                  {ingestEmail.cloudmailin_target ? (
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Target URL:</span> {ingestEmail.cloudmailin_target}</p>
                      <p><span className="font-medium">Username:</span> {ingestEmail.cloudmailin_username}</p>
                      <p><span className="font-medium">Password:</span> {ingestEmail.cloudmailin_password}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Configure CloudMailin to start receiving emails
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCloudMailinSettings.mutate()}
                        disabled={updateCloudMailinSettings.isPending}
                      >
                        {updateCloudMailinSettings.isPending ? "Configuring..." : "Configure"}
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}

        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(var(--primary))',
                    brandAccent: 'rgb(var(--primary))',
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;