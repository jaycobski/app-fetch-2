import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EmbedsPage = () => {
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: credentials } = await supabase
        .from('user_ingest_emails')
        .select('cloudmailin_username, cloudmailin_password')
        .single();

      if (!credentials) {
        toast.error("Unable to fetch authentication credentials");
        return;
      }

      const auth = btoa(`${credentials.cloudmailin_username}:${credentials.cloudmailin_password}`);
      
      const response = await fetch(
        `https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/process-url-content?url=${encodeURIComponent(url)}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to process URL');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success("URL successfully processed!");
        setUrl("");
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      toast.error("Failed to process URL");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <DashboardHeader onSignOut={async () => {
        const { error } = await supabase.auth.signOut();
        if (error) toast.error("Failed to sign out");
      }} />
      
      <div className="mt-8">
        <h1 className="text-2xl font-bold mb-6">Embed Content</h1>
        
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="Enter URL to embed..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button type="submit">
              <Link2 className="mr-2 h-4 w-4" />
              Embed
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmbedsPage;