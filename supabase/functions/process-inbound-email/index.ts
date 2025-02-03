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
  console.log('=== START OF REQUEST PROCESSING ===');
  console.log(`Received ${req.method} request to process-inbound-email`);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
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
    
    let emailData: CloudMailinEmail;
    try {
      emailData = JSON.parse(rawBody);
      console.log('Successfully parsed email data:', {
        to: emailData.envelope.recipients,
        from: emailData.envelope.from,
        subject: emailData.headers.subject,
        contentLength: emailData.html?.length || emailData.plain?.length,
        htmlContent: emailData.html?.substring(0, 500) // Log first 500 chars of HTML
      });
    } catch (parseError) {
      console.error('Failed to parse email data:', parseError);
      throw new Error(`Invalid email data: ${parseError.message}`);
    }

    const toEmail = emailData.envelope.recipients[0].toLowerCase().trim();
    console.log('Looking up recipient email:', toEmail);

    const { data: userIngestEmail, error: userError } = await supabaseClient
      .from('user_ingest_emails')
      .select('user_id, email_address')
      .eq('email_address', toEmail)
      .maybeSingle();

    if (userError) {
      console.error('Database error finding user:', userError);
      throw userError;
    }

    if (!userIngestEmail) {
      console.error('No user found for email:', toEmail);
      throw new Error(`Invalid recipient email: ${toEmail}`);
    }

    console.log('Found user for email:', {
      userId: userIngestEmail.user_id,
      emailAddress: userIngestEmail.email_address
    });

    // Extract URLs from HTML content
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const urls = emailData.html?.match(urlRegex) || [];
    console.log('Extracted URLs:', urls);

    const metadata = {
      headers: {
        subject: String(emailData.headers.subject || ''),
        contentType: String(emailData.headers['content-type'] || ''),
        from: String(emailData.headers.from || ''),
        to: String(emailData.headers.to || '')
      },
      envelope: {
        from: String(emailData.envelope.from || ''),
        to: emailData.envelope.recipients.map(r => String(r)),
        heloDomain: String(emailData.envelope.helo_domain || ''),
        remoteIp: String(emailData.envelope.remote_ip || '')
      },
      extractedUrls: urls
    };
    console.log('Created metadata:', JSON.stringify(metadata, null, 2));

    console.log('Attempting database insert...');
    const { data: ingest, error: ingestError } = await supabaseClient
      .from('ingest_content_feb')
      .insert({
        user_id: userIngestEmail.user_id,
        source_type: 'email',
        content_title: emailData.headers.subject || 'Email Content',
        content_body: emailData.html || emailData.plain || '',
        original_url: urls[0] || null, // Use the first URL found
        original_author: emailData.envelope.from,
        metadata: metadata,
        source_created_at: new Date().toISOString(),
        processed: false
      })
      .select()
      .single();

    if (ingestError) {
      console.error('Error storing content:', ingestError);
      throw ingestError;
    }

    console.log('Successfully stored email content:', JSON.stringify(ingest, null, 2));
    console.log('=== END OF REQUEST PROCESSING ===');

    return new Response(
      JSON.stringify({ success: true, ingest }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('=== ERROR IN REQUEST PROCESSING ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});