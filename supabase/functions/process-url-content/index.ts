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
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required in request body');
    }

    console.log('Processing URL:', url);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract post ID from Reddit URL
    const postIdMatch = url.match(/comments\/([^/]+)/);
    if (!postIdMatch) {
      throw new Error('Invalid Reddit URL');
    }

    const postId = postIdMatch[1];
    console.log('Extracted post ID:', postId);

    // Fetch Reddit post data
    const response = await fetch(`https://www.reddit.com/comments/${postId}.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch Reddit post');
    }

    const data = await response.json();
    const post = data[0]?.data?.children[0]?.data;

    if (!post) {
      throw new Error('Post not found');
    }

    console.log('Successfully fetched Reddit post data');

    return new Response(
      JSON.stringify({
        post: {
          title: post.title,
          selftext: post.selftext,
          author: post.author
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});