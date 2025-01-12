import PostCard from "./PostCard";

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
}

const PostList = ({ posts, onGenerateAI }: PostListProps) => {
  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No posts found. Start by fetching some posts!
      </div>
    );
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