import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebPage {
  title?: string;
  content?: string;
  author?: string;
  publishedAt?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { ingestId } = await req.json()
    
    if (!ingestId) {
      throw new Error('ingestId is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the ingest record
    const { data: ingest, error: fetchError } = await supabaseClient
      .from('ingest_content_feb')
      .select('*')
      .eq('id', ingestId)
      .single()

    if (fetchError || !ingest) {
      throw new Error(fetchError?.message || 'Ingest not found')
    }

    if (!ingest.original_url) {
      throw new Error('No URL found in ingest')
    }

    console.log(`Fetching content from URL: ${ingest.original_url}`)

    // Fetch the webpage content
    const response = await fetch(ingest.original_url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()

    // Extract content using basic parsing
    const webpage: WebPage = {
      title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(),
      content: html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]
        ?.replace(/<[^>]+>/g, ' ')
        ?.replace(/\s+/g, ' ')
        ?.trim()
        ?.substring(0, 5000), // Limit content length
      author: html.match(/author"[^>]*content="([^"]+)"/i)?.[1]?.trim(),
      publishedAt: html.match(/published_time"[^>]*content="([^"]+)"/i)?.[1]?.trim(),
    }

    console.log('Extracted webpage content:', webpage)

    // Update the ingest record with the extracted content
    const { error: updateError } = await supabaseClient
      .from('ingest_content_feb')
      .update({
        url_title: webpage.title,
        url_content: webpage.content,
        url_author: webpage.author,
        url_published_at: webpage.publishedAt,
        processed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ingestId)

    if (updateError) {
      throw new Error(`Failed to update ingest: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})