import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  ingestId: string;
}

serve(async (req: Request) => {
  console.log('Extract URL content function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { ingestId } = await req.json() as RequestBody;
    console.log('Processing ingest ID:', ingestId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the social content ingest record
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

    // Extract URL from content
    const content = ingest.content_body || '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    const firstUrl = urls?.[0];

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

    try {
      // Fetch the content from the URL
      const response = await fetch(firstUrl);
      const htmlContent = await response.text();

      // Basic metadata extraction (you might want to use a proper HTML parser in production)
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : null;

      // Update the record with the extracted URL and content
      const { error: updateError } = await supabaseClient
        .from('social_content_ingests')
        .update({
          extracted_url: firstUrl,
          url_content: htmlContent,
          url_title: title,
          processed: true
        })
        .eq('id', ingestId);

      if (updateError) {
        console.error('Error updating ingest:', updateError);
        throw updateError;
      }

      console.log('Successfully processed URL content for ingest:', ingestId);

      return new Response(
        JSON.stringify({ success: true, url: firstUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error fetching URL content:', error);
      
      // Update the record with the error
      await supabaseClient
        .from('social_content_ingests')
        .update({
          extracted_url: firstUrl,
          processed: true,
          error_message: `Error fetching URL content: ${error.message}`
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