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

      const testContent = `<div dir="ltr"><a href="https://www.linkedin.com/posts/vladgozman_apolloios-co-founder-ceo-tim-zheng-presented-activity-7291085102724313089-UQG4">https://www.linkedin.com/posts/vladgozman_apolloios-co-founder-ceo-tim-zheng-presented-activity-7291085102724313089-UQG4</a></div>`;

      const { data, error } = await supabase
        .from('social_content_ingests')
        .insert([
          {
            user_id: session.session.user.id,
            source_type: 'test',
            content_body: testContent,
            processed: false
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating test ingest:', error);
        toast.error("Failed to create test ingest");
        return;
      }

      console.log('Created test ingest:', data);
      toast.success("Test ingest created successfully");

    } catch (error) {
      console.error('Error in test ingest:', error);
      toast.error("Failed to create test ingest");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createTestIngest
  };
};