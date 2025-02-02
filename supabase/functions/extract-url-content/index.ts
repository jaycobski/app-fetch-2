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
      const postId = extractors.linkedin.extractPostId(url);
      if (!postId) throw new Error('Invalid LinkedIn URL');

      const oembedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${postId}`;
      const response = await fetch(oembedUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.querySelector('.post-text')?.textContent?.trim() || '';
      
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
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const title = doc.querySelector('title')?.textContent || '';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
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
  console.log('Extract URL content function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingestId } = await req.json() as RequestBody;
    console.log('Processing ingest ID:', ingestId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: ingest, error: fetchError } = await supabaseClient
      .from('social_content_ingests')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (fetchError || !ingest) {
      console.error('Error fetching ingest:', fetchError);
      throw new Error('Ingest not found');
    }

    console.log('Found ingest record:', ingest.id);
    console.log('Content body:', ingest.content_body);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = ingest.content_body?.match(urlRegex) || [];
    const firstUrl = urls[0];

    if (!firstUrl) {
      console.log('No URL found in content');
      await supabaseClient
        .from('social_content_ingests')
        .update({
          processed: true,
          error_message: 'No URL found in content'
        })
        .eq('id', ingestId);

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
        extractedContent = await extractors[sourcePlatform].extract(firstUrl);
      } else {
        extractedContent = await genericExtractor(firstUrl);
      }

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

      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update(updateData)
        .eq('id', ingestId);

      if (updateError) {
        console.error('Error updating ingest:', updateError);
        throw updateError;
      }

      console.log('Successfully processed URL content for ingest:', ingestId);

      return new Response(
        JSON.stringify({ success: true, url: firstUrl, platform: sourcePlatform }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error extracting content:', error);
      
      await supabaseClient
        .from('social_content_ingests')
        .update({
          extracted_url: firstUrl,
          processed: true,
          error_message: `Error extracting content: ${error.message}`,
          source_platform: sourcePlatform
        })
        .eq('id', ingestId);

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