import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Extract content function called");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { ingestId } = await req.json();
    console.log("Processing ingest ID:", ingestId);

    // Get the ingest record
    const { data: ingest, error: ingestError } = await supabaseClient
      .from('social_content_ingests')
      .select('*')
      .eq('id', ingestId)
      .single();

    if (ingestError) {
      console.error('Error fetching ingest:', ingestError);
      throw ingestError;
    }

    if (!ingest) {
      throw new Error('Ingest record not found');
    }

    console.log("Found ingest record:", ingest);

    // Insert into content_items
    const { data: contentItem, error: insertError } = await supabaseClient
      .from('content_items')
      .insert({
        user_id: ingest.user_id,
        source_type: ingest.source_type,
        title: ingest.content_title || 'Untitled Content',
        content: ingest.content_body,
        url: ingest.original_url,
        author: ingest.original_author,
        metadata: ingest.metadata,
        source_created_at: ingest.source_created_at
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting content item:', insertError);
      
      // Update the ingest record with error
      await supabaseClient
        .from('social_content_ingests')
        .update({
          processed: true,
          error_message: insertError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingestId);

      throw insertError;
    }

    console.log("Created content item:", contentItem);

    // Update the ingest record as processed
    const { error: updateError } = await supabaseClient
      .from('social_content_ingests')
      .update({
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingestId);

    if (updateError) {
      console.error('Error updating ingest status:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, contentItem }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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