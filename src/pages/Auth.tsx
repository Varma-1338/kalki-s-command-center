import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import kalkiPoster from "@/assets/kalki-poster.jpg";

const Auth = () => {
  const [loginKey, setLoginKey] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/team-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ login_key: loginKey.trim() }),
        }
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        toast({ title: "Login failed", description: data.error || "Invalid login key", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Sign in directly using the team credentials
      const teamEmail = `team-${loginKey.trim().toLowerCase()}@devfest.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: teamEmail,
        password: loginKey.trim(),
      });

      if (signInError) {
        toast({ title: "Login failed", description: signInError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img src={kalkiPoster} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/75 to-background/90" />

      <div className="relative z-10 w-full max-w-md space-y-6 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-gradient-gold glow-gold mb-1">DEV-FEST 2.0</h1>
          <p className="font-display text-sm text-kalki-cyan tracking-[0.3em] mb-6">HACKATHON 2898 AD</p>
        </div>

        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="team" className="font-display text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              TEAM LOGIN
            </TabsTrigger>
            <TabsTrigger value="admin" className="font-display text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              ADMIN LOGIN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-6">
            <form onSubmit={handleTeamLogin} className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">ENTER THE ARENA</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use your team's unique login key</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginKey" className="text-foreground">Team Login Key</Label>
                <Input
                  id="loginKey"
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  placeholder="Enter your team key"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary backdrop-blur-sm text-center font-mono text-lg tracking-widest"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-display text-lg tracking-wider bg-primary text-primary-foreground hover:bg-kalki-gold-light transition-all duration-300 glow-box-gold"
              >
                {loading ? "CONNECTING..." : "LOGIN"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">COMMAND CENTER</h2>
                <p className="mt-1 text-sm text-muted-foreground">Admin access only</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-foreground">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@kalki.dev"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="text-foreground">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary backdrop-blur-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-display text-lg tracking-wider bg-primary text-primary-foreground hover:bg-kalki-gold-light transition-all duration-300 glow-box-gold"
              >
                {loading ? "CONNECTING..." : "LOGIN"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
