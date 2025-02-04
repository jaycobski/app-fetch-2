import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  console.log("Process email content function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Parsing email data from request...');
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    const emailData: CloudMailinEmail = JSON.parse(rawBody);
    console.log('Parsed email data:', {
      to: emailData.envelope.recipients,
      from: emailData.envelope.from,
      subject: emailData.headers.subject,
      contentLength: emailData.html?.length || emailData.plain?.length
    });

    const toEmail = emailData.envelope.recipients[0].toLowerCase().trim();
    console.log('Looking up recipient email:', toEmail);

    const { data: userIngestEmail, error: userError } = await supabaseClient
      .from('user_ingest_emails')
      .select('user_id, email_address')
      .eq('email_address', toEmail)
      .maybeSingle();

    if (userError) {
      console.error('Database error finding user:', userError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: userError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userIngestEmail) {
      console.error('No user found for email:', toEmail);
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found user for email:', {
      userId: userIngestEmail.user_id,
      emailAddress: userIngestEmail.email_address
    });

    // Store in ingest_content_feb table
    const { data: ingest, error: ingestError } = await supabaseClient
      .from('ingest_content_feb')
      .insert({
        user_id: userIngestEmail.user_id,
        source_type: 'email',
        content_title: emailData.headers.subject || 'Email Content',
        content_body: emailData.html || emailData.plain || '',
        original_url: `mailto:${emailData.envelope.from}`,
        original_author: emailData.envelope.from,
        metadata: {
          headers: emailData.headers,
          envelope: emailData.envelope
        },
        source_created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (ingestError) {
      console.error('Error storing content:', ingestError);
      return new Response(
        JSON.stringify({ error: 'Failed to store email content', details: ingestError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully stored email content:', ingest);

    return new Response(
      JSON.stringify({ success: true, ingest }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});