import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useUrlIngest = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createTestIngest = async () => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("You must be logged in to test URL ingestion");
        return;
      }

      // Get the user's ingest email settings which contain the auth credentials
      const { data: ingestSettings, error: settingsError } = await supabase
        .from('user_ingest_emails')
        .select('cloudmailin_username, cloudmailin_password')
        .eq('user_id', session.session.user.id)
        .single();

      if (settingsError || !ingestSettings) {
        console.error('Error fetching ingest settings:', settingsError);
        toast.error("Failed to fetch ingest settings");
        return;
      }

      // Create basic auth header
      const basicAuth = btoa(`${ingestSettings.cloudmailin_username}:${ingestSettings.cloudmailin_password}`);

      // Test URL to ingest
      const testUrl = "https://www.linkedin.com/posts/vladgozman_apolloios-co-founder-ceo-tim-zheng-presented-activity-7291085102724313089-UQG4";

      // Make GET request with basic auth
      const response = await fetch(
        `https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/process-url-content?url=${encodeURIComponent(testUrl)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('URL ingest response:', result);
      toast.success("Test URL ingestion successful");

    } catch (error) {
      console.error('Error in test ingest:', error);
      toast.error("Failed to test URL ingestion");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createTestIngest
  };
};