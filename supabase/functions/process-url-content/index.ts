import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const browserHeaders = {
  'Accept': '*/*',
  'Accept-Encoding': 'deflate, gzip',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

interface OGTags {
  title?: string;
  description?: string;
  image?: string;
  author?: string;
  publishedTime?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the URL to get query parameters
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    
    console.log('[process-url-content] Processing URL:', targetUrl);

    if (!targetUrl) {
      throw new Error('URL parameter is required');
    }

    // Get Basic Auth credentials from the request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Basic ')) {
      throw new Error('Basic authentication is required');
    }

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Decode and validate Basic Auth credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    // Verify credentials against user_ingest_emails table
    const { data: userIngest, error: userError } = await supabaseClient
      .from('user_ingest_emails')
      .select('user_id')
      .eq('cloudmailin_username', username)
      .eq('cloudmailin_password', password)
      .single();

    if (userError || !userIngest) {
      console.error('[process-url-content] Invalid credentials:', userError);
      throw new Error('Invalid credentials');
    }

    console.log('[process-url-content] Authenticated for user:', userIngest.user_id);

    // Create ingest record
    const { data: ingest, error: ingestError } = await supabaseClient
      .from('ingest_content_feb')
      .insert([
        {
          user_id: userIngest.user_id,
          source_type: 'email',
          original_url: targetUrl,
          processed: false
        }
      ])
      .select()
      .single();

    if (ingestError) {
      console.error('[process-url-content] Error creating ingest:', ingestError);
      throw ingestError;
    }

    console.log('[process-url-content] Created ingest record:', ingest.id);

    // Fetch content from URL with browser-like headers
    const response = await fetch(targetUrl, {
      headers: browserHeaders
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const content = await response.text();
    console.log('[process-url-content] Fetched content length:', content.length);

    // Extract Open Graph tags
    const ogTags: OGTags = {
      title: content.match(/<meta property="og:title" content="([^"]+)"/)?.[1],
      description: content.match(/<meta property="og:description" content="([^"]+)"/)?.[1],
      image: content.match(/<meta property="og:image" content="([^"]+)"/)?.[1],
      author: content.match(/<meta property="article:author" content="([^"]+)"/)?.[1],
      publishedTime: content.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1]
    };

    console.log('[process-url-content] Extracted OG tags:', ogTags);

    // Extract JSON-LD data if available
    let jsonLd = null;
    const jsonLdMatch = content.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    if (jsonLdMatch) {
      try {
        jsonLd = JSON.parse(jsonLdMatch[1]);
        console.log('[process-url-content] Extracted JSON-LD data:', jsonLd);
      } catch (e) {
        console.error('[process-url-content] Error parsing JSON-LD:', e);
      }
    }

    // Update the ingest record with the extracted content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_title: ogTags.title,
        url_content: ogTags.description,
        url_author: ogTags.author,
        url_published_at: ogTags.publishedTime,
        platform_specific_data: jsonLd ? { jsonLd } : undefined,
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingest.id);

    if (updateError) {
      console.error('[process-url-content] Error updating ingest:', updateError);
      throw updateError;
    }

    console.log('[process-url-content] Successfully processed URL for ingest:', ingest.id);

    return new Response(
      JSON.stringify({ success: true, ingestId: ingest.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-url-content] Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});