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
          processed: true
        }
      ])
      .select()
      .single();

    if (ingestError) {
      console.error('[process-url-content] Error creating ingest:', ingestError);
      throw ingestError;
    }

    console.log('[process-url-content] Created ingest record:', ingest.id);

    // Fetch content from URL
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const content = await response.text();
    console.log('[process-url-content] Fetched content length:', content.length);

    // Update the ingest record with the content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_content: content,
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