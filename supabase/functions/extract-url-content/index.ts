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

    // Get unprocessed content
    const { data: unprocessedContent, error: fetchError } = await supabaseClient
      .from('social_content_ingests')
      .select('*')
      .eq('processed', false)
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
          console.log(`Processing content ID: ${content.id}`);
          
          let extractedContent = content.content_body;
          let extractedTitle = content.content_title;

          // If there's a URL, try to fetch its content
          if (content.original_url && !content.original_url.startsWith('mailto:')) {
            console.log(`Fetching content from URL: ${content.original_url}`);
            try {
              const response = await fetch(content.original_url);
              const html = await response.text();

              // Basic content extraction
              const titleMatch = html.match(/<title>(.*?)<\/title>/i);
              extractedTitle = titleMatch ? titleMatch[1] : content.content_title;

              // Extract text content (basic implementation)
              extractedContent = html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            } catch (error) {
              console.error(`Error fetching URL content: ${error.message}`);
              // Continue with original content if URL fetch fails
            }
          }

          // Insert into content_items
          const { data: contentItem, error: insertError } = await supabaseClient
            .from('content_items')
            .insert({
              user_id: content.user_id,
              source_type: content.source_type,
              title: extractedTitle || 'Untitled Content',
              content: extractedContent || content.content_body,
              url: content.original_url,
              author: content.original_author,
              metadata: content.metadata,
              source_created_at: content.source_created_at
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Error inserting content item: ${insertError.message}`);
            throw insertError;
          }

          // Update the social_content_ingests record as processed
          const { error: updateError } = await supabaseClient
            .from('social_content_ingests')
            .update({
              processed: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', content.id);

          if (updateError) {
            console.error(`Error updating ingest status: ${updateError.message}`);
            throw updateError;
          }

          return { id: content.id, success: true, contentItemId: contentItem.id };
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