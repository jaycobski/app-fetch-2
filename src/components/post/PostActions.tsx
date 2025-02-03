import { Switch } from "@/components/ui/switch";

interface PostActionsProps {
  postId: string;
  url: string;
  onGenerateAI: (postId: string, enabled: boolean) => void;
}

const PostActions = ({ postId, url, onGenerateAI }: PostActionsProps) => {
  return (
    <div className="flex items-center justify-between pt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:underline"
      >
        View Original
      </a>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Generate AI Overview</span>
        <Switch
          onCheckedChange={(checked) => onGenerateAI(postId, checked)}
        />
      </div>
    </div>
  );
};

export default PostActions;