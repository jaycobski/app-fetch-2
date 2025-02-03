import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  ingestId: string;
}

serve(async (req: Request) => {
  console.log('[extract-linkedin-content] Function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { ingestId } = body as RequestBody;
    
    if (!ingestId) {
      throw new Error('No ingestId provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the ingest record
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError || !ingest) {
      throw new Error(fetchError?.message || 'Ingest not found');
    }

    if (!ingest.original_url) {
      throw new Error('No URL to process');
    }

    console.log('[extract-linkedin-content] Fetching LinkedIn content from:', ingest.original_url);

    // Make a simple GET request to the LinkedIn post
    const response = await fetch(ingest.original_url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch LinkedIn content: ${response.status}`);
    }

    const content = await response.text();
    console.log('[extract-linkedin-content] Fetched content length:', content.length);

    // Extract post information from the URL
    const urlParts = ingest.original_url.split('/');
    const authorUsername = urlParts[4] || 'unknown';
    const postTitle = urlParts[5] || 'LinkedIn Post';

    // Update the ingest record with the fetched content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_title: postTitle,
        url_content: content,
        url_author: authorUsername,
        source_platform: 'linkedin',
        processed: true,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingestId);

    if (updateError) {
      throw updateError;
    }

    console.log('[extract-linkedin-content] Successfully processed LinkedIn content for ingest:', ingestId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-linkedin-content] Error:', error);
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('ingest_content_feb')
        .update({
          processed: true,
          error_message: `Error extracting LinkedIn content: ${error.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.ingestId);
    } catch (updateError) {
      console.error('[extract-linkedin-content] Error updating error state:', updateError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});