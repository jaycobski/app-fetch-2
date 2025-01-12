import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Summary {
  summary_content: string | null;
  status: string;
  error_message: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author?: string;
  subreddit?: string;
  url: string;
  summaries?: Summary[];
}

interface PostCardProps {
  post: Post;
  onGenerateAI: (postId: string, enabled: boolean) => void;
}

const PostCard = ({ post, onGenerateAI }: PostCardProps) => {
  const summary = post.summaries?.[0];
  const isGenerating = summary?.status === 'pending';
  const hasError = summary?.error_message != null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-2">
        <FileText className="h-5 w-5" />
        <CardTitle className="text-lg line-clamp-1">{post.title || "Untitled Post"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {post.content && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.content}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {post.author && <span>By: {post.author}</span>}
            {post.subreddit && <span>r/{post.subreddit}</span>}
          </div>
          
          {/* AI Summary Section */}
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

          <div className="flex items-center justify-between pt-2">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              View Original
            </a>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Generate AI Overview</span>
              <Switch
                onCheckedChange={(checked) => onGenerateAI(post.id, checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;