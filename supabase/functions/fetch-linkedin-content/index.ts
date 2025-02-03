import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LINKEDIN_HOST = "www.linkedin.com";
const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-linkedin-content] Starting LinkedIn content fetch');

    // Parse request body
    const { ingestId } = await req.json();
    if (!ingestId) {
      throw new Error('ingestId is required');
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the record
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('ingest_content_feb')
      .select('id, original_url')
      .eq('id', ingestId)
      .single();

    if (fetchError || !record) {
      throw new Error(`Failed to fetch record: ${fetchError?.message || 'Record not found'}`);
    }

    const { original_url } = record;
    if (!original_url?.includes(LINKEDIN_HOST)) {
      throw new Error('Not a LinkedIn URL');
    }

    console.log(`[fetch-linkedin-content] Processing LinkedIn URL: ${original_url}`);

    // Prepare headers for LinkedIn request
    const headers = new Headers({
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });

    // Make the request to LinkedIn
    const response = await fetch(original_url, {
      headers,
      redirect: "follow",
      compress: true
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check content length
    const contentLength = parseInt(response.headers.get("content-length") || "0");
    if (contentLength > MAX_CONTENT_LENGTH) {
      throw new Error('Content too large');
    }

    const content = await response.text();

    // Extract metadata using regex
    const title = content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const author = content.match(/author"[^>]*content="([^"]+)"/i)?.[1]?.trim();
    const publishedAt = content.match(/published_time"[^>]*content="([^"]+)"/i)?.[1]?.trim();

    // Log the extraction results
    console.log('[fetch-linkedin-content] Extracted metadata:', {
      title: title || 'Not found',
      author: author || 'Not found',
      publishedAt: publishedAt || 'Not found'
    });

    // Update the record with the fetched content
    const { error: updateError } = await supabaseAdmin
      .from('ingest_content_feb')
      .update({
        url_content: content.substring(0, 10000), // Limit content length
        url_title: title,
        url_author: author,
        url_published_at: publishedAt,
        processed: true,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingestId);

    if (updateError) {
      throw updateError;
    }

    console.log('[fetch-linkedin-content] Successfully processed LinkedIn content');

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: ingestId,
        metadata: { title, author, publishedAt }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-linkedin-content] Error:', error);

    // If we have an ingestId, update the record with the error
    try {
      const { ingestId } = await req.json();
      if (ingestId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseAdmin
          .from('ingest_content_feb')
          .update({
            processed: true,
            error_message: `Failed to fetch LinkedIn content: ${error.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', ingestId);
      }
    } catch (e) {
      console.error('[fetch-linkedin-content] Error updating record:', e);
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