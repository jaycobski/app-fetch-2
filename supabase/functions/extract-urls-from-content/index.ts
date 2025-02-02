import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  ingestId: string;
}

// Function to extract URLs from text content
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

serve(async (req: Request) => {
  console.log('[extract-urls-from-content] Function called with method:', req.method);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[extract-urls-from-content] Request body:', body);
    
    const { ingestId } = body as RequestBody;
    if (!ingestId) {
      console.error('[extract-urls-from-content] No ingestId provided in request body');
      throw new Error('No ingestId provided');
    }
    
    console.log('[extract-urls-from-content] Processing ingest ID:', ingestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[extract-urls-from-content] Supabase client created');

    // Fetch the ingest record
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError) {
      console.error('[extract-urls-from-content] Error fetching ingest:', fetchError);
      throw new Error(`Ingest not found: ${fetchError.message}`);
    }

    if (!ingest) {
      console.error('[extract-urls-from-content] No ingest found with ID:', ingestId);
      throw new Error('Ingest not found');
    }

    console.log('[extract-urls-from-content] Found ingest record:', {
      id: ingest.id,
      content: ingest.content_body?.substring(0, 100) // Log first 100 chars
    });

    if (!ingest.content_body) {
      console.error('[extract-urls-from-content] No content body found in ingest');
      throw new Error('No content body found in ingest');
    }

    // Extract URLs from content
    const urls = extractUrls(ingest.content_body);
    console.log('[extract-urls-from-content] Extracted URLs:', urls);

    if (urls.length === 0) {
      console.log('[extract-urls-from-content] No URLs found in content');
      // Update the record to mark it as processed with no URLs
      await supabaseClient
        .from('ingest_content_feb')
        .update({
          processed: true,
          error_message: 'No URLs found in content'
        })
        .eq('id', ingestId);
      
      return new Response(
        JSON.stringify({ success: true, message: 'No URLs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the ingest record with the first URL found
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        original_url: urls[0], // Store the first URL found
        processed: false // Keep as false so URL content extraction can happen
      })
      .eq('id', ingestId);

    if (updateError) {
      console.error('[extract-urls-from-content] Error updating ingest:', updateError);
      throw updateError;
    }

    console.log('[extract-urls-from-content] Successfully processed content for ingest:', ingestId);

    return new Response(
      JSON.stringify({ success: true, urls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-urls-from-content] Error in function:', error);
    
    // Try to update the ingest record with the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('ingest_content_feb')
        .update({
          processed: true,
          error_message: `Error extracting URLs: ${error.message}`
        })
        .eq('id', body.ingestId);
    } catch (updateError) {
      console.error('[extract-urls-from-content] Error updating ingest with error state:', updateError);
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