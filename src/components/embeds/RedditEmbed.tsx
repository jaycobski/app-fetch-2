import { useEffect, useState, useRef } from 'react';
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
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadScript = () => {
      // Remove existing script if it exists
      if (scriptRef.current) {
        scriptRef.current.remove();
      }

      const script = document.createElement('script');
      script.src = 'https://embed.reddit.com/widgets.js';
      script.async = true;
      script.charset = 'UTF-8';
      
      // Only append if container exists
      if (containerRef.current) {
        containerRef.current.appendChild(script);
        scriptRef.current = script;
      }
    };

    const fetchPostContent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('process-url-content', {
          body: { url: postUrl }
        });

        if (error) {
          throw error;
        }

        if (data?.post) {
          setPost(data.post);
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch post content');
      } finally {
        setLoading(false);
      }
    };

    fetchPostContent();
    loadScript();

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [postUrl]);

  return (
    <div ref={containerRef} className="space-y-4">
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