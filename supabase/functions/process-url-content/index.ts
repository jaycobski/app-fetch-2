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
  console.log('[process-url-content] Function called with method:', req.method);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[process-url-content] Request body:', body);
    
    const { ingestId } = body as RequestBody;
    if (!ingestId) {
      console.error('[process-url-content] No ingestId provided in request body');
      throw new Error('No ingestId provided');
    }
    
    console.log('[process-url-content] Processing ingest ID:', ingestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[process-url-content] Supabase client created');

    // Fetch the ingest record
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError) {
      console.error('[process-url-content] Error fetching ingest:', fetchError);
      throw new Error(`Ingest not found: ${fetchError.message}`);
    }

    if (!ingest) {
      console.error('[process-url-content] No ingest found with ID:', ingestId);
      throw new Error('Ingest not found');
    }

    if (!ingest.original_url) {
      console.error('[process-url-content] No URL found in ingest');
      throw new Error('No URL found in ingest');
    }

    console.log('[process-url-content] Fetching content from URL:', ingest.original_url);

    // Fetch the webpage content with custom headers to mimic a browser
    const response = await fetch(ingest.original_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      console.error('[process-url-content] Failed to fetch URL:', response.status, response.statusText);
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('[process-url-content] Fetched HTML content. Length:', html.length);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) {
      console.error('[process-url-content] Failed to parse HTML');
      throw new Error('Failed to parse HTML');
    }

    // Extract metadata using Open Graph tags and fallback to regular meta tags
    const title = 
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      doc.querySelector('title')?.textContent ||
      '';
      
    const content = 
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      doc.querySelector('article')?.textContent?.trim() ||
      '';
      
    const author = 
      doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
      '';
      
    const publishedTime = 
      doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');

    console.log('[process-url-content] Extracted content:', {
      title,
      contentLength: content.length,
      author,
      publishedTime
    });

    // Update the ingest record with the extracted content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_title: title,
        url_content: content,
        url_author: author,
        url_published_at: publishedTime,
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
    console.error('[process-url-content] Error in function:', error);
    
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
          error_message: `Error processing URL: ${error.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.ingestId);
    } catch (updateError) {
      console.error('[process-url-content] Error updating ingest with error state:', updateError);
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