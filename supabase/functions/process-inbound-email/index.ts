import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, resend-signature',
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
const resendSigningSecret = Deno.env.get("RESEND_SIGNING_SECRET")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify Resend webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = new Uint8Array(
    signature.split(",")[1].split("").map(c => c.charCodeAt(0))
  );

  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the raw body for signature verification
    const rawBody = await req.clone().text();
    const signature = req.headers.get("resend-signature");
    
    if (!signature) {
      console.error("No Resend signature found");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify the webhook signature
    try {
      const isValid = await verifySignature(rawBody, signature, resendSigningSecret);

      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const email: InboundEmail = JSON.parse(rawBody);
    console.log("Received email:", email);

    // Extract user ID from the email address
    const toAddress = email.to;
    const match = toAddress.match(/^share-([a-f0-9]+)@/);
    
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
    console.error("Error processing email:", error);
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