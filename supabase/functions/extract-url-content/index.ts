import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Logging utility
const log = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  }
};

// Function to fetch ingest record
async function getIngestRecord(supabaseClient: any, ingestId: string) {
  log.info('Fetching ingest record for ID:', ingestId);
  
  const { data: ingest, error: ingestError } = await supabaseClient
    .from('social_content_ingests')
    .select('*')
    .eq('id', ingestId)
    .single();

  if (ingestError) {
    log.error('Error fetching ingest:', ingestError);
    throw ingestError;
  }

  if (!ingest) {
    log.error('No ingest record found for ID:', ingestId);
    throw new Error('Ingest record not found');
  }

  log.info('Successfully fetched ingest record:', ingest);
  return ingest;
}

// Function to create content item
async function createContentItem(supabaseClient: any, ingest: any) {
  log.info('Preparing to create content item from ingest:', { ingestId: ingest.id });

  const contentItemData = {
    user_id: ingest.user_id,
    source_type: ingest.source_type,
    title: ingest.content_title || 'Untitled Content',
    content: ingest.content_body,
    url: ingest.original_url,
    author: ingest.original_author,
    metadata: ingest.metadata,
    source_created_at: ingest.source_created_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  log.info('Inserting content item with data:', contentItemData);

  const { data: contentItem, error: insertError } = await supabaseClient
    .from('content_items')
    .insert(contentItemData)
    .select()
    .single();

  if (insertError) {
    log.error('Error inserting content item:', insertError);
    throw insertError;
  }

  log.info('Successfully created content item:', { contentItemId: contentItem.id });
  return contentItem;
}

// Function to update ingest status
async function updateIngestStatus(supabaseClient: any, ingestId: string, success: boolean, errorMessage?: string) {
  log.info('Updating ingest status:', { ingestId, success, errorMessage });

  const updateData = {
    processed: true,
    updated_at: new Date().toISOString(),
    ...(errorMessage && { error_message: errorMessage })
  };

  const { error: updateError } = await supabaseClient
    .from('social_content_ingests')
    .update(updateData)
    .eq('id', ingestId);

  if (updateError) {
    log.error('Error updating ingest status:', updateError);
    throw updateError;
  }

  log.info('Successfully updated ingest status');
}

serve(async (req) => {
  log.info('Extract content function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { ingestId } = await req.json();
    log.info('Processing ingest ID:', ingestId);

    // Get the ingest record
    const ingest = await getIngestRecord(supabaseClient, ingestId);

    // Create content item
    const contentItem = await createContentItem(supabaseClient, ingest);

    // Update ingest status
    await updateIngestStatus(supabaseClient, ingestId, true);

    log.info('Successfully processed ingest:', { ingestId, contentItemId: contentItem.id });

    return new Response(
      JSON.stringify({ success: true, contentItem }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error in extract-url-content function:', error);
    
    // If we have an ingestId, try to update the status with the error
    try {
      if (req.body && typeof req.body === 'object' && 'ingestId' in req.body) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await updateIngestStatus(supabaseClient, req.body.ingestId, false, error.message);
      }
    } catch (updateError) {
      log.error('Error updating ingest status after failure:', updateError);
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