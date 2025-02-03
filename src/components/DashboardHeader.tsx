import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
  onSignOut: () => Promise<void>;
}

const DashboardHeader = ({ onSignOut }: DashboardHeaderProps) => {
  return (
    <header className="flex justify-between items-center">
      <nav className="flex gap-4">
        <Link to="/" className="text-lg font-semibold">
          Dashboard
        </Link>
        <Link to="/embeds" className="text-lg">
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