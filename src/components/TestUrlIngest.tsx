import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUrlIngest } from "@/hooks/useUrlIngest";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TestUrlIngest = () => {
  const { isLoading, createTestIngest } = useUrlIngest();

  // Query to fetch the latest test ingest
  const { data: latestIngest } = useQuery({
    queryKey: ['latestTestIngest'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return null;
      
      console.log('Fetching latest ingest for user:', session.session.user.id);
      
      const { data, error } = await supabase
        .from('ingest_content_feb')  // Changed back to ingest_content_feb
        .select('*')
        .eq('user_id', session.session.user.id)
        .eq('source_type', 'email')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching latest ingest:', error);
        return null;
      }
      
      console.log('Latest test ingest:', data);
      return data;
    },
    refetchInterval: 2000, // Refetch every 2 seconds to see updates
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test URL Extraction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the button below to test URL content extraction with a sample LinkedIn post URL.
        </p>
        <Button 
          onClick={createTestIngest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test URL Extraction"
          )}
        </Button>

        {latestIngest && (
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Status:</strong> {latestIngest.processed ? 'Processed' : 'Processing...'}</p>
            {latestIngest.error_message && (
              <p className="text-destructive"><strong>Error:</strong> {latestIngest.error_message}</p>
            )}
            {latestIngest.original_url && (
              <p><strong>Extracted URL:</strong> {latestIngest.original_url}</p>
            )}
            {latestIngest.url_content && (
              <p><strong>Fetched Content:</strong> {latestIngest.url_content.substring(0, 100)}...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestUrlIngest;