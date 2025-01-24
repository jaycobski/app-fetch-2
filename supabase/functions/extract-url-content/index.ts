import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get unprocessed content with URLs
    const { data: unprocessedContent, error: fetchError } = await supabaseClient
      .from('social_content_ingests')
      .select('*')
      .eq('processed', false)
      .not('original_url', 'is', null)
      .limit(10);

    if (fetchError) {
      console.error('Error fetching unprocessed content:', fetchError);
      throw fetchError;
    }

    console.log(`Processing ${unprocessedContent?.length ?? 0} items`);

    if (!unprocessedContent?.length) {
      return new Response(
        JSON.stringify({ message: 'No content to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processResults = await Promise.all(
      unprocessedContent.map(async (content) => {
        try {
          console.log(`Fetching content from URL: ${content.original_url}`);
          const response = await fetch(content.original_url);
          const html = await response.text();

          // Basic content extraction - you might want to use a more sophisticated parser
          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : null;

          // Extract text content (basic implementation)
          const textContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Update the record with extracted content
          const { error: updateError } = await supabaseClient
            .from('social_content_ingests')
            .update({
              content_title: title || content.content_title,
              content_body: textContent,
              processed: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', content.id);

          if (updateError) {
            console.error(`Error updating content ${content.id}:`, updateError);
            throw updateError;
          }

          return { id: content.id, success: true };
        } catch (error) {
          console.error(`Error processing content ${content.id}:`, error);
          
          // Update the record with error information
          await supabaseClient
            .from('social_content_ingests')
            .update({
              processed: true,
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', content.id);

          return { id: content.id, success: false, error: error.message };
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, results: processResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-url-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});