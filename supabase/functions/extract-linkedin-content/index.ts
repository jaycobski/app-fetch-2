import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
      .from('social_content_ingests')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError || !ingest) {
      throw new Error(fetchError?.message || 'Ingest not found');
    }

    if (!ingest.extracted_url) {
      throw new Error('No URL to process');
    }

    console.log('[extract-linkedin-content] Processing LinkedIn URL:', ingest.extracted_url);

    // Update the record with basic information we can determine from the URL
    const urlParts = ingest.extracted_url.split('/');
    const authorUsername = urlParts[4] || 'unknown';
    const postTitle = urlParts[5] || 'LinkedIn Post';
    
    // Since we can't access LinkedIn content directly, we'll store what we can
    const { error: updateError } = await supabaseClient
      .from('social_content_ingests')
      .update({
        url_title: `LinkedIn post by ${authorUsername}`,
        url_content: `This content is from LinkedIn and requires authentication to view. Original URL: ${ingest.extracted_url}`,
        url_author: authorUsername,
        source_platform: 'linkedin',
        processed: true,
        error_message: 'LinkedIn content requires authentication to access',
        updated_at: new Date().toISOString()
      })
      .eq('id', ingestId);

    if (updateError) {
      throw updateError;
    }

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
        .from('social_content_ingests')
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