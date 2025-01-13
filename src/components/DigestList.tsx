import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText } from "lucide-react";

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

interface DigestListProps {
  posts: Post[];
}

const DigestList = ({ posts }: DigestListProps) => {
  const postsWithSummaries = posts.filter((post) => 
    post.summaries && post.summaries.length > 0 && 
    post.summaries.some(summary => summary.summary_content)
  );

  if (postsWithSummaries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No digests found. Generate some summaries first!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
      <div className="space-y-6">
        {postsWithSummaries.map((post) => (
          <div key={post.id} className="bg-card rounded-lg p-6 shadow-sm border">
            <h3 className="font-semibold mb-2">{post.title}</h3>
            {post.summaries?.map((summary, index) => (
              summary.summary_content && (
                <div key={index} className="text-muted-foreground text-sm">
                  {summary.summary_content}
                </div>
              )
            ))}
            <div className="mt-4 text-xs text-muted-foreground">
              {post.subreddit && (
                <span className="mr-2">r/{post.subreddit}</span>
              )}
              {post.author && (
                <span>by {post.author}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default DigestList;