import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Post {
  id: string;
  title: string;
  content: string;
  author?: string;
  subreddit?: string;
  url: string;
}

interface PostCardProps {
  post: Post;
  onGenerateAI: (postId: string, enabled: boolean) => void;
}

const PostCard = ({ post, onGenerateAI }: PostCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-2">
        <FileText className="h-5 w-5" />
        <CardTitle className="text-lg line-clamp-1">{post.title || "Untitled Post"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {post.content && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.content}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {post.author && <span>By: {post.author}</span>}
            {post.subreddit && <span>r/{post.subreddit}</span>}
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