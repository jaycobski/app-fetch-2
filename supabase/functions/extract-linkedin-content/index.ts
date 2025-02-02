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

    console.log('[extract-linkedin-content] Fetching LinkedIn content from:', ingest.extracted_url);

    // Fetch the LinkedIn page
    const response = await fetch(ingest.extracted_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LinkedIn content: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    // Extract metadata using Open Graph tags
    const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                 doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                       doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const author = doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
                  doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
    const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');

    console.log('[extract-linkedin-content] Extracted content:', {
      title,
      description,
      author,
      publishedTime
    });

    // Update the ingest record with extracted content
    const { error: updateError } = await supabaseClient
      .from('social_content_ingests')
      .update({
        url_title: title,
        url_content: description,
        url_author: author,
        url_published_at: publishedTime,
        source_platform: 'linkedin',
        processed: true,
        error_message: null,
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