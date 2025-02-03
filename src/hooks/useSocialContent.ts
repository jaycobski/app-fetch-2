import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSocialContent = () => {
  return useQuery({
    queryKey: ['socialContent'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      console.log('Fetching social content for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('social_content_ingests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching social content:', error);
        throw error;
      }
      
      console.log('Fetched social content:', data);
      return data;
    },
  });
};