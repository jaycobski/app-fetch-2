import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";
import IngestEmailAlert from "@/components/IngestEmailAlert";
import ContentSection from "@/components/ContentSection";

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
      
      if (error) {
        console.error('Error fetching ingest email:', error);
        throw error;
      }
      
      console.log('Ingest email data:', data);
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

  return (
    <div className="container mx-auto py-8 px-4">
      <DashboardHeader onSignOut={handleSignOut} />
      <IngestEmailAlert 
        emailAddress={ingestEmail?.email_address} 
        isLoading={emailLoading} 
      />
      <ContentSection />
    </div>
  );
};

export default Index;