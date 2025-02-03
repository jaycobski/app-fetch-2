import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUrlIngest } from "@/hooks/useUrlIngest";
import { Loader2 } from "lucide-react";

const TestUrlIngest = () => {
  const { isLoading, createTestIngest } = useUrlIngest();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test URL Extraction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the button below to test URL content extraction with a sample LinkedIn post URL.
        </p>
        <Button 
          onClick={createTestIngest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test URL Extraction"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestUrlIngest;