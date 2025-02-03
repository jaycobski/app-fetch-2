import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
  onSignOut: () => Promise<void>;
}

const DashboardHeader = ({ onSignOut }: DashboardHeaderProps) => {
  return (
    <header className="flex justify-between items-center mb-8">
      <nav className="flex items-center gap-4">
        <Link 
          to="/" 
          className="text-lg font-semibold hover:text-primary transition-colors"
        >
          Dashboard
        </Link>
        <Link 
          to="/embeds" 
          className="text-lg hover:text-primary transition-colors"
        >
          Embeds
        </Link>
      </nav>
      <Button variant="outline" onClick={onSignOut}>
        Sign Out
      </Button>
    </header>
  );
};

export default DashboardHeader;