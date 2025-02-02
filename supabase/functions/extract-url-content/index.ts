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
    extractPostId: (url: string): string | null => {
      const match = url.match(/activity-(\d+)-[a-zA-Z0-9]+/);
      return match ? match[1] : null;
    },
    extract: async (url: string) => {
      console.log('[LinkedIn Extractor] Starting extraction for URL:', url);
      const postId = extractors.linkedin.extractPostId(url);
      if (!postId) {
        console.error('[LinkedIn Extractor] Invalid LinkedIn URL, no post ID found');
        throw new Error('Invalid LinkedIn URL');
      }

      const oembedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${postId}`;
      console.log('[LinkedIn Extractor] Fetching oembed URL:', oembedUrl);
      
      const response = await fetch(oembedUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.querySelector('.post-text')?.textContent?.trim() || '';
      
      console.log('[LinkedIn Extractor] Extraction completed. Content length:', content.length);
      return {
        content,
        platformPostId: postId,
        platformSpecificData: { type: 'post' }
      };
    }
  },
  reddit: {
    matchDomain: (url: string) => url.includes('reddit.com'),
    extractPostId: (url: string): string | null => {
      // TODO: Implement Reddit post ID extraction
      return null;
    },
    extract: async (url: string) => {
      // TODO: Implement Reddit content extraction
      throw new Error('Reddit extraction not implemented yet');
    }
  },
  medium: {
    matchDomain: (url: string) => url.includes('medium.com'),
    extract: async (url: string) => {
      // TODO: Implement Medium content extraction
      throw new Error('Medium extraction not implemented yet');
    }
  },
  // Add more platform extractors here
};

// Generic fallback extractor for unknown platforms
const genericExtractor = async (url: string) => {
  console.log('[Generic Extractor] Starting extraction for URL:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[Generic Extractor] Failed to fetch URL:', url, 'Status:', response.status);
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[Generic Extractor] Fetched HTML content. Length:', html.length);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) {
      console.error('[Generic Extractor] Failed to parse HTML');
      throw new Error('Failed to parse HTML');
    }
    
    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
    
    console.log('[Generic Extractor] Extracted metadata:', {
      title,
      metaDescription,
      ogTitle,
      ogDescription
    });
    
    return {
      content: metaDescription || ogDescription || '',
      title: title || ogTitle || '',
      platformSpecificData: { type: 'generic' }
    };
  } catch (error) {
    console.error('[Generic Extractor] Error:', error);
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

    console.log('[extract-url-content] Fetching ingest record...');
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('social_content_ingests')
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

    console.log('[extract-url-content] Found ingest record:', {
      id: ingest.id,
      contentBody: ingest.content_body?.substring(0, 100) + '...' // Log first 100 chars
    });

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = ingest.content_body?.match(urlRegex) || [];
    const firstUrl = urls[0];

    console.log('[extract-url-content] Extracted URLs:', urls);
    console.log('[extract-url-content] First URL:', firstUrl);

    if (!firstUrl) {
      console.log('[extract-url-content] No URL found in content');
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update({
          processed: true,
          error_message: 'No URL found in content'
        })
        .eq('id', ingestId);

      if (updateError) {
        console.error('[extract-url-content] Error updating ingest with no URL:', updateError);
      }

      return new Response(
        JSON.stringify({ message: 'No URL found in content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourcePlatform = Object.keys(extractors).find(platform => 
      extractors[platform].matchDomain(firstUrl)
    ) || 'generic';
    
    console.log('[extract-url-content] Detected platform:', sourcePlatform);

    try {
      let extractedContent;
      
      if (sourcePlatform !== 'generic' && extractors[sourcePlatform]) {
        console.log(`[${sourcePlatform} Extractor] Starting extraction`);
        extractedContent = await extractors[sourcePlatform].extract(firstUrl);
      } else {
        console.log('[Generic Extractor] Starting extraction');
        extractedContent = await genericExtractor(firstUrl);
      }

      console.log('[extract-url-content] Content extracted successfully:', {
        contentLength: extractedContent.content?.length || 0,
        title: extractedContent.title
      });

      const updateData = {
        extracted_url: firstUrl,
        url_content: extractedContent.content,
        url_title: extractedContent.title,
        processed: true,
        error_message: null,
        source_platform: sourcePlatform,
        platform_post_id: extractedContent.platformPostId,
        platform_specific_data: extractedContent.platformSpecificData
      };

      console.log('[extract-url-content] Updating ingest with extracted content...');
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update(updateData)
        .eq('id', ingestId);

      if (updateError) {
        console.error('[extract-url-content] Error updating ingest with content:', updateError);
        throw updateError;
      }

      console.log('[extract-url-content] Successfully processed URL content for ingest:', ingestId);

      return new Response(
        JSON.stringify({ success: true, url: firstUrl, platform: sourcePlatform }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('[extract-url-content] Error extracting content:', error);
      
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update({
          extracted_url: firstUrl,
          processed: true,
          error_message: `Error extracting content: ${error.message}`,
          source_platform: sourcePlatform
        })
        .eq('id', ingestId);

      if (updateError) {
        console.error('[extract-url-content] Error updating ingest with error state:', updateError);
      }

      throw error;
    }

  } catch (error) {
    console.error('[extract-url-content] Error in function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});