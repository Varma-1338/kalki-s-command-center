import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import kalkiPoster from "@/assets/kalki-poster.jpg";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent you a verification link." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Full-screen background image */}
      <img
        src={kalkiPoster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/75 to-background/90" />

      {/* Auth Form */}
      <div className="relative z-10 w-full max-w-md space-y-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-gradient-gold glow-gold mb-1">DEV-FEST 2.0</h1>
          <p className="font-display text-sm text-kalki-cyan tracking-[0.3em] mb-6">HACKATHON 2898 AD</p>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isLogin ? "ENTER THE ARENA" : "JOIN THE QUEST"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isLogin ? "Login to access your mission" : "Register to begin your journey"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your warrior name"
                required={!isLogin}
                className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary backdrop-blur-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="warrior@kalki.dev"
              required
              className="bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Processing..." : isLogin ? "LOGIN" : "REGISTER"}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-kalki-cyan hover:text-kalki-cyan-glow transition-colors font-medium"
          >
            {isLogin ? "New warrior? Register here" : "Already registered? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
