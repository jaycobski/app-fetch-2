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

// Function to extract content from a URL
const extractUrlContent = async (url: string) => {
  console.log('[URL Content Extractor] Starting extraction for URL:', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[URL Content Extractor] Failed to fetch URL:', url, 'Status:', response.status);
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[URL Content Extractor] Fetched HTML content. Length:', html.length);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) {
      console.error('[URL Content Extractor] Failed to parse HTML');
      throw new Error('Failed to parse HTML');
    }
    
    // Extract metadata
    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
    const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
    
    console.log('[URL Content Extractor] Extracted metadata:', {
      title,
      metaDescription,
      ogTitle,
      ogDescription,
      author,
      publishedTime
    });
    
    return {
      title: ogTitle || title,
      content: ogDescription || metaDescription,
      author,
      publishedAt: publishedTime ? new Date(publishedTime) : null
    };
  } catch (error) {
    console.error('[URL Content Extractor] Error:', error);
    throw error;
  }
};

serve(async (req: Request) => {
  console.log('[extract-url-content] Function called with method:', req.method);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[extract-url-content] Request body:', body);
    
    const { ingestId } = body as RequestBody;
    if (!ingestId) {
      console.error('[extract-url-content] No ingestId provided in request body');
      throw new Error('No ingestId provided');
    }
    
    console.log('[extract-url-content] Processing ingest ID:', ingestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[extract-url-content] Supabase client created');

    // Fetch the ingest record
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError) {
      console.error('[extract-url-content] Error fetching ingest:', fetchError);
      throw new Error(`Ingest not found: ${fetchError.message}`);
    }

    if (!ingest) {
      console.error('[extract-url-content] No ingest found with ID:', ingestId);
      throw new Error('Ingest not found');
    }

    if (!ingest.original_url) {
      console.error('[extract-url-content] No URL found in ingest');
      throw new Error('No URL found in ingest');
    }

    console.log('[extract-url-content] Found ingest record:', {
      id: ingest.id,
      url: ingest.original_url
    });

    // Extract content from URL
    const extractedContent = await extractUrlContent(ingest.original_url);
    console.log('[extract-url-content] Content extracted:', extractedContent);

    // Update the ingest record with extracted content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_title: extractedContent.title,
        url_content: extractedContent.content,
        url_author: extractedContent.author,
        url_published_at: extractedContent.publishedAt,
        processed: true,
        error_message: null
      })
      .eq('id', ingestId);

    if (updateError) {
      console.error('[extract-url-content] Error updating ingest:', updateError);
      throw updateError;
    }

    console.log('[extract-url-content] Successfully processed URL for ingest:', ingestId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-url-content] Error in function:', error);
    
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
        .eq('id', (body as RequestBody).ingestId);
    } catch (updateError) {
      console.error('[extract-url-content] Error updating ingest with error state:', updateError);
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