interface PostMetadataProps {
  author?: string;
  subreddit?: string;
}

const PostMetadata = ({ author, subreddit }: PostMetadataProps) => {
  if (!author && !subreddit) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {author && <span>By: {author}</span>}
      {subreddit && <span>r/{subreddit}</span>}
    </div>
  );
};

export default PostMetadata;