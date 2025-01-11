import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request details
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Parse request body
    let body;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      body = JSON.parse(text);
      console.log('Parsed request body:', body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      throw new Error(`Invalid request body: ${e.message}`);
    }

    const { postId, content } = body;
    if (!postId || !content) {
      console.error('Missing required fields:', { postId, content });
      throw new Error('Missing required fields: postId and content are required');
    }

    // Get API key and validate authorization
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not configured');
      throw new Error('Server configuration error: API key not found');
    }

    // Log that we're about to make the Perplexity API request
    console.log('Making request to Perplexity API with content length:', content.length);

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
    });

    // Log the Perplexity API response status
    console.log('Perplexity API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Perplexity API response:', result);
    
    if (!result.choices?.[0]?.message?.content) {
      console.error('Invalid response format from Perplexity:', result);
      throw new Error('Invalid response format from Perplexity API');
    }

    const summary = result.choices[0].message.content;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the summary
    const { error: summaryError } = await supabaseClient
      .from('summaries')
      .insert({
        post_id: postId,
        content: summary,
        status: 'completed'
      });

    if (summaryError) {
      console.error('Error storing summary:', summaryError);
      throw summaryError;
    }

    return new Response(
      JSON.stringify({ summary }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Edge function error:', {
      message: error.message,
      stack: error.stack,
      error
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});