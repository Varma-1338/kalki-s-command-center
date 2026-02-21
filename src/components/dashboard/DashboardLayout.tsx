import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1
                className="font-display text-lg font-bold text-gradient-gold cursor-pointer"
                onClick={() => navigate("/")}
              >
                KALKI 2898
              </h1>
              <span className="text-xs font-display text-kalki-cyan uppercase tracking-widest">
                {role === "admin" ? "COMMAND CENTER" : "WARRIOR PORTAL"}
              </span>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="font-display text-sm tracking-wider border-destructive text-destructive hover:bg-destructive/10"
            >
              LOGOUT
            </Button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
