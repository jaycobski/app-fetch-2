import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CloudMailinEmail {
  headers: {
    [key: string]: string;
  };
  envelope: {
    to: string;
    from: string;
    helo_domain: string;
    remote_ip: string;
    recipients: string[];
  };
  plain: string;
  html: string;
  reply_plain: string;
  attachments: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the incoming email data
    const emailData: CloudMailinEmail = await req.json();
    console.log('Received email:', emailData);

    // Extract the user identifier from the recipient email
    const toEmail = emailData.envelope.recipients[0];
    const userIdentifier = toEmail.split('@')[0].replace('share-', '');

    // Query the user_ingest_emails table to find the user
    const { data: userIngestEmail, error: userError } = await supabaseClient
      .from('user_ingest_emails')
      .select('user_id, email_address')
      .eq('email_address', toEmail)
      .single();

    if (userError || !userIngestEmail) {
      console.error('Error finding user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the email content in fetched_posts
    const { data: post, error: postError } = await supabaseClient
      .from('fetched_posts')
      .insert({
        user_id: userIngestEmail.user_id,
        source: 'email',
        external_id: crypto.randomUUID(),
        title: emailData.headers.subject || 'Email Content',
        content: emailData.html || emailData.plain,
        url: `mailto:${emailData.envelope.from}`,
        author: emailData.envelope.from,
        metadata: {
          headers: emailData.headers,
          envelope: emailData.envelope,
        }
      })
      .select()
      .single();

    if (postError) {
      console.error('Error storing post:', postError);
      return new Response(
        JSON.stringify({ error: 'Failed to store email content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, post }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});