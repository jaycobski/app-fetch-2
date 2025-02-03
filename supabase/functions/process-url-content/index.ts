import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingestId } = await req.json();
    console.log('[process-url-content] Processing ingest ID:', ingestId);

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

    console.log('[process-url-content] Fetching content from:', ingest.original_url);

    // Simple GET request with minimal headers
    const response = await fetch(ingest.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const content = await response.text();
    console.log('[process-url-content] Fetched content length:', content.length);

    // Update the ingest record with the raw content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_content: content,
        processed: true,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingestId);

    if (updateError) {
      throw updateError;
    }

    console.log('[process-url-content] Successfully processed URL for ingest:', ingestId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-url-content] Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});