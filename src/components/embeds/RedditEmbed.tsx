import { useEffect } from 'react';

interface RedditEmbedProps {
  postUrl: string;
  height?: number;
}

const RedditEmbed = ({ postUrl, height = 410 }: RedditEmbedProps) => {
  useEffect(() => {
    // Load Reddit embed script
    const script = document.createElement('script');
    script.src = 'https://embed.reddit.com/widgets.js';
    script.async = true;
    script.charset = 'UTF-8';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <blockquote 
      className="reddit-embed-bq" 
      style={{ height: `${height}px` }} 
      data-embed-height={height}
    >
      <a href={postUrl}>View Reddit post</a>
    </blockquote>
  );
};

export default RedditEmbed;