import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface RedditEmbedProps {
  postUrl: string;
  height?: number;
}

interface RedditPost {
  title?: string;
  selftext?: string;
  author?: string;
}

const RedditEmbed = ({ postUrl, height = 410 }: RedditEmbedProps) => {
  const [post, setPost] = useState<RedditPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Reddit embed script
    const script = document.createElement('script');
    script.src = 'https://embed.reddit.com/widgets.js';
    script.async = true;
    script.charset = 'UTF-8';
    document.body.appendChild(script);

    // Fetch post content
    const fetchPostContent = async () => {
      try {
        const response = await fetch(
          `https://umugzdepvpezfmnjowcn.supabase.co/functions/v1/process-url-content?url=${encodeURIComponent(postUrl)}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch post content');
        }

        const data = await response.json();
        setPost(data.post);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch post content');
      } finally {
        setLoading(false);
      }
    };

    fetchPostContent();

    return () => {
      document.body.removeChild(script);
    };
  }, [postUrl]);

  return (
    <div className="space-y-4">
      {loading && <p className="text-gray-500">Loading post content...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {post && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">{post.title}</h3>
          {post.selftext && (
            <p className="text-gray-700 whitespace-pre-wrap">{post.selftext}</p>
          )}
          {post.author && (
            <p className="text-sm text-gray-500">Posted by {post.author}</p>
          )}
        </div>
      )}
      <blockquote 
        className="reddit-embed-bq" 
        style={{ height: `${height}px` }} 
        data-embed-height={height}
      >
        <a href={postUrl}>View Reddit post</a>
      </blockquote>
    </div>
  );
};

export default RedditEmbed;