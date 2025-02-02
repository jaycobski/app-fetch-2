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

// Generic URL content extractor
const extractUrlContent = async (url: string) => {
  console.log('[URL Extractor] Starting extraction for URL:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[URL Extractor] Failed to fetch URL:', url, 'Status:', response.status);
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[URL Extractor] Fetched HTML content. Length:', html.length);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) {
      console.error('[URL Extractor] Failed to parse HTML');
      throw new Error('Failed to parse HTML');
    }
    
    // Extract metadata
    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
    const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
    
    console.log('[URL Extractor] Extracted metadata:', {
      title,
      metaDescription,
      ogTitle,
      ogDescription,
      author,
      publishedTime
    });
    
    return {
      title: title || ogTitle || '',
      content: metaDescription || ogDescription || '',
      author,
      publishedAt: publishedTime ? new Date(publishedTime) : null
    };
  } catch (error) {
    console.error('[URL Extractor] Error:', error);
    throw error;
  }
};

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

    console.log('[process-url-content] Found ingest record:', {
      id: ingest.id,
      url: ingest.original_url
    });

    if (!ingest.original_url) {
      console.error('[process-url-content] No URL found in ingest');
      throw new Error('No URL found in ingest');
    }

    // Extract content from URL
    const extractedContent = await extractUrlContent(ingest.original_url);
    console.log('[process-url-content] Content extracted:', extractedContent);

    // Update the ingest record with extracted content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        content_title: extractedContent.title,
        content_body: extractedContent.content,
        original_author: extractedContent.author,
        source_created_at: extractedContent.publishedAt,
        processed: true,
        error_message: null
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
          error_message: `Error processing URL: ${error.message}`
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