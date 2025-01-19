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

const resendSigningSecret = Deno.env.get("RESEND_SIGNING_SECRET")!;

// Verify Resend webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  console.log("Verifying signature for payload:", payload.substring(0, 100) + "...");
  console.log("With signature:", signature);
  
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

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
  
  console.log("Signature verification result:", isValid);
  return isValid;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request:", req.method);
  console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the raw body for signature verification
    const rawBody = await req.clone().text();
    console.log("Raw body:", rawBody.substring(0, 100) + "...");
    
    const signature = req.headers.get("resend-signature");
    console.log("Resend signature:", signature);
    
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
    console.log("Parsed email:", email);

    // Instead of processing here, we'll invoke the process-email-content function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the process-email-content function
    const { data, error } = await supabase.functions.invoke('process-email-content', {
      body: email
    });

    if (error) {
      console.error("Error invoking process-email-content:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process email content" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
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