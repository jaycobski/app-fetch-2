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
      console.log('Starting LinkedIn extraction for URL:', url);
      const postId = extractors.linkedin.extractPostId(url);
      if (!postId) throw new Error('Invalid LinkedIn URL');

      const oembedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${postId}`;
      console.log('Fetching LinkedIn oembed URL:', oembedUrl);
      
      const response = await fetch(oembedUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.querySelector('.post-text')?.textContent?.trim() || '';
      
      console.log('LinkedIn extraction completed. Content length:', content.length);
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
  console.log('Starting generic extraction for URL:', url);
  try {
    const response = await fetch(url);
    const html = await response.text();
    console.log('Fetched HTML content. Length:', html.length);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
    console.log('Generic extraction completed:', {
      titleLength: title.length,
      descriptionLength: metaDescription.length
    });
    
    return {
      content: metaDescription,
      title: title,
      platformSpecificData: { type: 'generic' }
    };
  } catch (error) {
    console.error('Error in generic extraction:', error);
    throw error;
  }
};

// Determine content source from URL
const determineContentSource = (url: string): string => {
  for (const [platform, extractor] of Object.entries(extractors)) {
    if (extractor.matchDomain(url)) {
      return platform;
    }
  }
  return 'generic';
};

serve(async (req: Request) => {
  console.log('Extract URL content function called with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { ingestId } = body as RequestBody;
    console.log('Processing ingest ID:', ingestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching ingest record...');
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('social_content_ingests')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError) {
      console.error('Error fetching ingest:', fetchError);
      throw new Error('Ingest not found');
    }

    console.log('Found ingest record:', {
      id: ingest.id,
      contentLength: ingest.content_body?.length || 0
    });

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = ingest.content_body?.match(urlRegex) || [];
    const firstUrl = urls[0];

    if (!firstUrl) {
      console.log('No URL found in content');
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update({
          processed: true,
          error_message: 'No URL found in content'
        })
        .eq('id', ingestId);

      if (updateError) {
        console.error('Error updating ingest with no URL:', updateError);
      }

      return new Response(
        JSON.stringify({ message: 'No URL found in content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted URL:', firstUrl);
    const sourcePlatform = determineContentSource(firstUrl);
    console.log('Detected platform:', sourcePlatform);

    try {
      let extractedContent;
      
      if (sourcePlatform !== 'generic' && extractors[sourcePlatform]) {
        console.log('Using platform-specific extractor for:', sourcePlatform);
        extractedContent = await extractors[sourcePlatform].extract(firstUrl);
      } else {
        console.log('Using generic extractor');
        extractedContent = await genericExtractor(firstUrl);
      }

      console.log('Content extracted successfully');

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

      console.log('Updating ingest with extracted content...');
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update(updateData)
        .eq('id', ingestId);

      if (updateError) {
        console.error('Error updating ingest with content:', updateError);
        throw updateError;
      }

      console.log('Successfully processed URL content for ingest:', ingestId);

      return new Response(
        JSON.stringify({ success: true, url: firstUrl, platform: sourcePlatform }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error extracting content:', error);
      
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
        console.error('Error updating ingest with error state:', updateError);
      }

      throw error;
    }

  } catch (error) {
    console.error('Error in extract-url-content function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
