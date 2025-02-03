import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onSignOut: () => Promise<void>;
}

const DashboardHeader = ({ onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <Button variant="outline" onClick={onSignOut}>Sign Out</Button>
    </div>
  );
};

export default DashboardHeader;