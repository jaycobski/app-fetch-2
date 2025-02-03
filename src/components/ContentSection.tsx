import TestUrlIngest from "@/components/TestUrlIngest";
import SocialContentList from "@/components/SocialContentList";

const ContentSection = () => {
  return (
    <div className="space-y-8">
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Test URL Content Extraction</h2>
        <TestUrlIngest />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Content</h2>
        <SocialContentList />
      </div>
    </div>
  );
};

export default ContentSection;