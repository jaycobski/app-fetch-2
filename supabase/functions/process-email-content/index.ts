import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InboundEmail {
  from: string
  to: string
  subject?: string
  text?: string
  html?: string
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  console.log("Process email content function called");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const email: InboundEmail = await req.json();
    console.log("Processing email content for:", email);

    // Extract user ID from the email address
    const toAddress = email.to;
    const match = toAddress.match(/^share-([a-f0-9]+)@/);
    console.log("Email address match:", match);
    
    if (!match) {
      console.error("Invalid ingest email format");
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Find the user by their ingest email hash
    const { data: ingestEmail, error: ingestError } = await supabase
      .from('user_ingest_emails')
      .select('user_id')
      .eq('email_address', toAddress)
      .single();

    console.log("Ingest email lookup result:", { ingestEmail, ingestError });

    if (ingestError || !ingestEmail) {
      console.error("Error finding user:", ingestError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Store the email content in fetched_posts
    const { data: post, error: postError } = await supabase
      .from('fetched_posts')
      .insert([
        {
          user_id: ingestEmail.user_id,
          source: 'email',
          external_id: crypto.randomUUID(),
          title: email.subject || 'No Subject',
          content: email.text || email.html || '',
          url: '', // No URL for email content
          author: email.from,
          metadata: {
            raw_email: email
          }
        }
      ])
      .select()
      .single();

    console.log("Post creation result:", { post, postError });

    if (postError) {
      console.error("Error storing post:", postError);
      return new Response(
        JSON.stringify({ error: "Failed to store post" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, post }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error processing email content:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}

serve(handler);