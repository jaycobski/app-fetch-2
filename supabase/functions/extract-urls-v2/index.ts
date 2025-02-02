import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  record_id: string;
}

// Enhanced URL extraction function that handles both HTML and plain text
const extractUrls = (content: string): string[] => {
  console.log('[URL Extractor v2] Starting extraction from content length:', content.length);
  
  const urls: Set<string> = new Set();
  
  try {
    // First try to parse as HTML to extract href attributes
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    if (doc) {
      // Extract URLs from href attributes
      const links = doc.getElementsByTagName('a');
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          urls.add(href);
        }
      }
      console.log('[URL Extractor v2] Found URLs from HTML:', urls.size);
    }
  } catch (error) {
    console.error('[URL Extractor v2] HTML parsing error:', error);
  }
  
  // Also look for URLs in plain text using improved regex
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([^\s<]+\.[^\s<]+)/g;
  const matches = content.match(urlRegex) || [];
  
  for (const match of matches) {
    let url = match;
    // Ensure URLs start with http/https
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    // Remove any trailing punctuation
    url = url.replace(/[.,;!]$/, '');
    
    try {
      new URL(url); // Validate URL
      urls.add(url);
    } catch {
      console.log('[URL Extractor v2] Invalid URL found:', url);
    }
  }
  
  console.log('[URL Extractor v2] Total unique URLs found:', urls.size);
  return Array.from(urls);
};

serve(async (req: Request) => {
  console.log('[extract-urls-v2] Function called with method:', req.method);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[extract-urls-v2] Request body:', body);
    
    const { record_id } = body as RequestBody;
    if (!record_id) {
      console.error('[extract-urls-v2] No record_id provided in request body');
      throw new Error('No record_id provided');
    }
    
    console.log('[extract-urls-v2] Processing record ID:', record_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[extract-urls-v2] Supabase client created');

    // Fetch the record
    const { data: record, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('content_body')
      .eq('id', record_id)
      .single();

    if (fetchError) {
      console.error('[extract-urls-v2] Error fetching record:', fetchError);
      throw new Error(`Record not found: ${fetchError.message}`);
    }

    if (!record) {
      console.error('[extract-urls-v2] No record found with ID:', record_id);
      throw new Error('Record not found');
    }

    if (!record.content_body) {
      console.error('[extract-urls-v2] No content body found in record');
      throw new Error('No content body found in record');
    }

    // Extract URLs from content with enhanced function
    const urls = extractUrls(record.content_body);
    console.log('[extract-urls-v2] Extracted URLs:', urls);

    if (urls.length === 0) {
      console.log('[extract-urls-v2] No URLs found in content');
      // Update the record to mark it as processed with no URLs
      await supabaseClient
        .from('ingest_content_feb')
        .update({
          processed: true,
          error_message: 'No URLs found in content'
        })
        .eq('id', record_id);
      
      return new Response(
        JSON.stringify({ success: true, message: 'No URLs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the record with the first URL found
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        original_url: urls[0], // Store the first URL found
        processed: false // Keep as false so URL content extraction can happen
      })
      .eq('id', record_id);

    if (updateError) {
      console.error('[extract-urls-v2] Error updating record:', updateError);
      throw updateError;
    }

    console.log('[extract-urls-v2] Successfully processed content for record:', record_id);

    return new Response(
      JSON.stringify({ success: true, urls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-urls-v2] Error in function:', error);
    
    // Try to update the record with the error
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
        .eq('id', (body as RequestBody).record_id);
    } catch (updateError) {
      console.error('[extract-urls-v2] Error updating record with error state:', updateError);
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