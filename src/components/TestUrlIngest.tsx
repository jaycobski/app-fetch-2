import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TestUrlIngest = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestIngest = async () => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast.error("You must be logged in to test URL ingestion");
        return;
      }

      const testContent = `<div dir="ltr"><a href="https://www.linkedin.com/posts/vladgozman_apolloios-co-founder-ceo-tim-zheng-presented-activity-7291085102724313089-UQG4?utm_source=share&utm_medium=member_desktop">https://www.linkedin.com/posts/vladgozman_apolloios-co-founder-ceo-tim-zheng-presented-activity-7291085102724313089-UQG4?utm_source=share&utm_medium=member_desktop</a></div>`;

      const { data, error } = await supabase
        .from('social_content_ingests')
        .insert([
          {
            user_id: session.session.user.id,
            source_type: 'test',
            content_body: testContent,
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click the button below to test URL content extraction with a sample LinkedIn post URL.
      </p>
      <Button 
        onClick={handleTestIngest}
        disabled={isLoading}
      >
        {isLoading ? "Testing..." : "Test URL Extraction"}
      </Button>
    </div>
  );
};

export default TestUrlIngest;