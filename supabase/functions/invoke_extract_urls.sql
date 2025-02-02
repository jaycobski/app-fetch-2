-- Create the function to invoke the Edge Function
CREATE OR REPLACE FUNCTION public.invoke_extract_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the attempt to invoke the function
  RAISE LOG 'Attempting to invoke extract-urls-from-content for ingest ID: %', NEW.id;
  
  -- Invoke the function for all new content
  PERFORM
    net.http_post(
      url:='https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/extract-urls-from-content',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
      ),
      body:=jsonb_build_object(
        'ingestId', NEW.id
      )
    );
    
  RAISE LOG 'Successfully sent request to extract-urls-from-content for ingest ID: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error invoking extract-urls-from-content for ingest ID: %. Error: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_extract_urls
  AFTER INSERT ON ingest_content_feb
  FOR EACH ROW
  EXECUTE FUNCTION invoke_extract_urls();