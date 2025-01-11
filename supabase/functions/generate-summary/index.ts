import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { postId, content } = await req.json()
    console.log('Received request:', { postId, content })
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured')
    }

    console.log('Making request to Perplexity API...')
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of content. Keep summaries under 3 sentences.'
          },
          {
            role: 'user',
            content: `Please summarize this content: ${content}`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 1
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', errorText)
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Perplexity API response:', result)
    
    const summary = result.choices[0].message.content

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store the summary
    const { error: summaryError } = await supabaseClient
      .from('summaries')
      .insert({
        post_id: postId,
        content: summary,
        status: 'completed'
      })

    if (summaryError) {
      console.error('Error storing summary:', summaryError)
      throw summaryError
    }

    return new Response(
      JSON.stringify({ summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})