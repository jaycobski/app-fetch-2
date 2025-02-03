import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface IngestEmailAlertProps {
  emailAddress: string | null;
  isLoading: boolean;
}

const IngestEmailAlert = ({ emailAddress, isLoading }: IngestEmailAlertProps) => {
  const copyEmailToClipboard = async () => {
    if (emailAddress) {
      try {
        await navigator.clipboard.writeText(emailAddress);
        toast.success("Email address copied to clipboard");
      } catch (err) {
        console.error("Failed to copy email:", err);
        toast.error("Failed to copy email address");
      }
    }
  };

  if (isLoading) return null;

  return emailAddress ? (
    <Alert className="mb-8">
      <AlertDescription>
        <div className="flex items-center justify-between gap-2">
          <div className="break-all">
            <span className="font-medium">Your content sharing email:</span>
            <br />
            {emailAddress}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyEmailToClipboard}
          >
            Copy
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Share content to this email address to automatically save it to your account. 
          You can always find this email in your dashboard.
        </p>
      </AlertDescription>
    </Alert>
  ) : (
    <Alert className="mb-8" variant="destructive">
      <AlertDescription>
        No ingest email found. Please try signing out and signing back in, or contact support if the issue persists.
      </AlertDescription>
    </Alert>
  );
};

export default IngestEmailAlert;