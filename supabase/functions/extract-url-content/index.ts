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

// Platform-specific extractors
const extractors = {
  linkedin: {
    matchDomain: (url: string) => url.includes('linkedin.com'),
    extract: async (url: string) => {
      console.log('[LinkedIn Extractor] Starting extraction for URL:', url);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch LinkedIn content: ${response.status}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // LinkedIn specific meta tags
        const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                     doc.querySelector('title')?.textContent || '';
        const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                          doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const author = doc.querySelector('meta[property="article:author"]')?.getAttribute('content') || '';
        const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
        
        console.log('[LinkedIn Extractor] Extracted content:', { title, description, author, publishedTime });
        
        return { 
          title, 
          content: description, 
          author,
          publishedAt: publishedTime ? new Date(publishedTime) : null
        };
      } catch (error) {
        console.error('[LinkedIn Extractor] Error:', error);
        throw error;
      }
    }
  }
};

// Generic fallback extractor
const genericExtractor = async (url: string) => {
  console.log('[Generic Extractor] Starting extraction for URL:', url);
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                 doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                      doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
    const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
    
    return {
      title,
      content: description,
      author,
      publishedAt: publishedTime ? new Date(publishedTime) : null
    };
  } catch (error) {
    console.error('[Generic Extractor] Error:', error);
    throw error;
  }
};

serve(async (req: Request) => {
  console.log('[extract-url-content] Function called');

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

    // Determine which extractor to use
    const platform = Object.keys(extractors).find(p => 
      extractors[p].matchDomain(ingest.extracted_url)
    );
    
    let extractedContent;
    if (platform) {
      console.log(`[extract-url-content] Using ${platform} extractor`);
      extractedContent = await extractors[platform].extract(ingest.extracted_url);
    } else {
      console.log('[extract-url-content] Using generic extractor');
      extractedContent = await genericExtractor(ingest.extracted_url);
    }

    // Update the ingest record
    const { error: updateError } = await supabaseClient
      .from('social_content_ingests')
      .update({
        url_title: extractedContent.title,
        url_content: extractedContent.content,
        url_author: extractedContent.author,
        url_published_at: extractedContent.publishedAt,
        source_platform: platform || 'generic',
        processed: true,
        error_message: null
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
    console.error('[extract-url-content] Error:', error);
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('social_content_ingests')
        .update({
          processed: true,
          error_message: `Error extracting content: ${error.message}`
        })
        .eq('id', body.ingestId);
    } catch (updateError) {
      console.error('[extract-url-content] Error updating error state:', updateError);
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