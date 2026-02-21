import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

const Dashboard = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="font-display text-2xl text-gradient-gold glow-gold animate-pulse-glow">
          LOADING...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return role === "admin" ? <AdminDashboard /> : <ParticipantDashboard />;
};

export default Dashboard;
