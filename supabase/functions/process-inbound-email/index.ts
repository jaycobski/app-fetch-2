import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmail {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendSigningSecret = Deno.env.get("RESEND_SIGNING_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Resend webhook signature if secret is configured
    if (resendSigningSecret) {
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
      // TODO: Implement signature verification
    }

    const email: InboundEmail = await req.json();
    console.log("Received email:", email);

    // Extract user ID from the email address
    const toAddress = email.to.toLowerCase();
    const { data: ingestEmail, error: ingestError } = await supabase
      .from("user_ingest_emails")
      .select("user_id")
      .eq("email_address", toAddress)
      .single();

    if (ingestError || !ingestEmail) {
      console.error("No matching user found for email:", toAddress);
      return new Response(
        JSON.stringify({ error: "No matching user found" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Store the content in fetched_posts
    const { data: post, error: postError } = await supabase
      .from("fetched_posts")
      .insert({
        user_id: ingestEmail.user_id,
        source: "email",
        external_id: crypto.randomUUID(),
        title: email.subject,
        content: email.text || email.html || "",
        url: "",
        author: email.from,
        metadata: {
          originalEmail: email
        }
      })
      .select()
      .single();

    if (postError) {
      console.error("Error storing post:", postError);
      return new Response(
        JSON.stringify({ error: "Failed to store content" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "Content processed successfully", post }),
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
};

serve(handler);