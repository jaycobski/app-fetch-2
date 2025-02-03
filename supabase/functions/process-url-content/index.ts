import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[process-url-content] No authorization header');
      throw new Error('No authorization header');
    }

    const { ingestId } = await req.json();
    console.log('[process-url-content] Processing ingest ID:', ingestId);

    if (!ingestId) {
      throw new Error('ingestId is required');
    }

    // Initialize Supabase client with service role key
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
      console.error('[process-url-content] Error fetching ingest:', fetchError);
      throw new Error(fetchError?.message || 'Ingest not found');
    }

    if (!ingest.original_url) {
      console.error('[process-url-content] No URL found in ingest');
      throw new Error('No URL to process');
    }

    console.log('[process-url-content] Fetching content from:', ingest.original_url);

    // Simple GET request with minimal headers
    const response = await fetch(ingest.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      console.error('[process-url-content] Fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const content = await response.text();
    console.log('[process-url-content] Fetched content length:', content.length);
    console.log('[process-url-content] First 500 chars of content:', content.substring(0, 500));

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
      console.error('[process-url-content] Error updating ingest:', updateError);
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});