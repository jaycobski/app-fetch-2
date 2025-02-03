import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-url-content-v2] Starting batch URL content fetch');

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch unprocessed records with URLs
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('ingest_content_feb')
      .select('id, original_url')
      .eq('processed', false)
      .not('original_url', 'is', null)
      .limit(10); // Process in batches of 10

    if (fetchError) {
      console.error('[fetch-url-content-v2] Error fetching records:', fetchError);
      throw fetchError;
    }

    console.log(`[fetch-url-content-v2] Found ${records?.length || 0} records to process`);

    if (!records?.length) {
      return new Response(
        JSON.stringify({ message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each record
    const results = await Promise.all(
      records.map(async (record) => {
        try {
          console.log(`[fetch-url-content-v2] Processing URL: ${record.original_url}`);

          // Attempt to fetch the content
          const response = await fetch(record.original_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            redirect: 'follow',
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const content = await response.text();
          
          // Extract basic metadata using regex
          const title = content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
          const author = content.match(/author"[^>]*content="([^"]+)"/i)?.[1]?.trim();
          const publishedAt = content.match(/published_time"[^>]*content="([^"]+)"/i)?.[1]?.trim();

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
            .eq('id', record.id);

          if (updateError) {
            throw updateError;
          }

          return { 
            id: record.id, 
            success: true, 
            url: record.original_url 
          };

        } catch (error) {
          console.error(`[fetch-url-content-v2] Error processing ${record.original_url}:`, error);

          // Update record with error
          await supabaseAdmin
            .from('ingest_content_feb')
            .update({
              processed: true,
              error_message: `Failed to fetch content: ${error.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);

          return { 
            id: record.id, 
            success: false, 
            url: record.original_url, 
            error: error.message 
          };
        }
      })
    );

    console.log('[fetch-url-content-v2] Batch processing completed');

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-url-content-v2] Fatal error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});