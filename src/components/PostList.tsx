import PostCard from "./PostCard";
import PostListEmptyState from "./post/PostListEmptyState";
import PostListSkeleton from "./post/PostListSkeleton";

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

interface PostListProps {
  posts: Post[];
  onGenerateAI: (postId: string, enabled: boolean) => void;
  isLoading?: boolean;
}

const PostList = ({ posts, onGenerateAI, isLoading }: PostListProps) => {
  if (isLoading) {
    return <PostListSkeleton />;
  }

  if (posts.length === 0) {
    return <PostListEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onGenerateAI={onGenerateAI}
        />
      ))}
    </div>
  );
};

export default PostList;