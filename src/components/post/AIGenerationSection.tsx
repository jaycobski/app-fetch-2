import { Loader2 } from "lucide-react";

interface Summary {
  summary_content: string | null;
  status: string;
  error_message: string | null;
}

interface AIGenerationSectionProps {
  summary?: Summary;
}

const AIGenerationSection = ({ summary }: AIGenerationSectionProps) => {
  const isGenerating = summary?.status === 'pending';
  const hasError = summary?.error_message != null;

  return (
    <div className="min-h-[60px] rounded-md bg-accent/50 p-3">
      {isGenerating ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating summary...</span>
        </div>
      ) : hasError ? (
        <p className="text-sm text-red-500">
          Error generating summary: {summary.error_message}
        </p>
      ) : summary?.summary_content ? (
        <p className="text-sm text-muted-foreground">
          {summary.summary_content}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          AI summary will appear here...
        </p>
      )}
    </div>
  );
};

export default AIGenerationSection;