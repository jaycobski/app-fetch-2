import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import AIGenerationSection from "./post/AIGenerationSection";
import PostMetadata from "./post/PostMetadata";
import PostActions from "./post/PostActions";

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
          
          <PostMetadata author={post.author} subreddit={post.subreddit} />
          <AIGenerationSection summary={summary} />
          <PostActions 
            postId={post.id} 
            url={post.url} 
            onGenerateAI={onGenerateAI} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;