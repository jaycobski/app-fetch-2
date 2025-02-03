import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Linkedin } from "lucide-react";

interface CardHeaderProps {
  title: string;
  sourceType: string;
  sourcePlatform?: string | null;
}

const CardHeader = ({ title, sourceType, sourcePlatform }: CardHeaderProps) => {
  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <CardTitle className="text-lg font-medium">
        {title}
      </CardTitle>
      <Badge variant="default" className="ml-2">
        <span className="flex items-center gap-1">
          {getSourceIcon(sourcePlatform || sourceType)}
          {sourcePlatform || sourceType}
        </span>
      </Badge>
    </div>
  );
};

export default CardHeader;