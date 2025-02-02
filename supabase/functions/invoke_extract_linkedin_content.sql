CREATE OR REPLACE FUNCTION public.invoke_extract_linkedin_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log the attempt to invoke the function
  PERFORM log_function_execution('invoke_extract_linkedin_content', 
    format('Processing LinkedIn content for ingest ID: %s', NEW.id)
  );
  
  -- Only invoke for LinkedIn URLs
  IF NEW.extracted_url LIKE '%linkedin.com%' THEN
    PERFORM
      net.http_post(
        url:='https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/extract-linkedin-content',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
        ),
        body:=jsonb_build_object(
          'ingestId', NEW.id
        )
      );
      
    PERFORM log_function_execution('invoke_extract_linkedin_content',
      format('Successfully triggered LinkedIn processing for ID: %s', NEW.id)
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_function_execution('invoke_extract_linkedin_content', NULL,
    format('Error triggering LinkedIn processing for ID: %s. Error: %s', 
           NEW.id, SQLERRM)
  );
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_extract_linkedin_content ON social_content_ingests;
CREATE TRIGGER trigger_extract_linkedin_content
  AFTER UPDATE OF extracted_url ON social_content_ingests
  FOR EACH ROW
  WHEN (NEW.extracted_url LIKE '%linkedin.com%' AND NOT NEW.processed)
  EXECUTE FUNCTION invoke_extract_linkedin_content();