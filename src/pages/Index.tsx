import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import kalkiCity from "@/assets/kalki-city.jpg";
import kalkiWarrior from "@/assets/kalki-warrior.jpg";
import kalkiDystopia from "@/assets/kalki-dystopia.jpg";
import kalkiHand from "@/assets/kalki-hand.jpg";
import kalkiBujji from "@/assets/kalki-bujji.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero Section - Full screen with city background */}
      <div className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0">
          <img src={kalkiCity} alt="Kalki 2898 AD" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between p-6 lg:px-12">
          <h1 className="font-display text-xl font-bold text-gradient-gold">DEV FEST-2.0</h1>
          <Button
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
            className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-kalki-gold-light glow-box-gold"
          >
            {user ? "DASHBOARD" : "LOGIN"}
          </Button>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <p className="font-display text-kalki-cyan text-lg tracking-[0.3em] uppercase animate-pulse-glow">
                The Future Awaits
              </p>
              <h1 className="font-display text-6xl md:text-8xl font-black glow-gold text-gradient-gold leading-tight">
                DEV-FEST 2.0
              </h1>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
                HACKATHON <span className="text-kalki-cyan">2898 AD</span>
              </h2>
            </div>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Enter the arena. Choose your destiny. Build the future in this epic hackathon inspired by the world of Kalki.
            </p>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
                size="lg"
                className="font-display text-lg tracking-wider px-12 py-6 bg-primary text-primary-foreground hover:bg-kalki-gold-light transition-all duration-500 glow-box-gold"
              >
                {user ? "GO TO DASHBOARD" : "LOGIN"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Section with image backgrounds */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-gold glow-gold text-center mb-16">
            YOUR MISSION BRIEFING
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="group relative rounded-xl overflow-hidden h-80 border-glow-gold">
              <img src={kalkiWarrior} alt="Choose Your Path" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-xl font-bold text-kalki-cyan mb-2">CHOOSE YOUR PATH</h3>
                <p className="text-muted-foreground text-sm">Select from curated problem statements and forge your destiny in the arena.</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative rounded-xl overflow-hidden h-80 border-glow-gold">
              <img src={kalkiDystopia} alt="Build The Future" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-xl font-bold text-kalki-cyan mb-2">BUILD THE FUTURE</h3>
                <p className="text-muted-foreground text-sm">Collaborate with your team and create solutions that shape the world of 2898 AD.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative rounded-xl overflow-hidden h-80 border-glow-gold">
              <img src={kalkiBujji} alt="Rise As Legends" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-xl font-bold text-kalki-cyan mb-2">RISE AS LEGENDS</h3>
                <p className="text-muted-foreground text-sm">Prove your worth. Let Bujji guide you to victory in this ultimate challenge.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action with hand image */}
      <section className="relative py-32 px-6">
        <div className="absolute inset-0">
          <img src={kalkiHand} alt="Kalki" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70" />
        </div>
        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gradient-gold glow-gold">
            THE PROPHECY CALLS
          </h2>
          <p className="text-xl text-muted-foreground">
            The age of Kali demands warriors. Register now and answer the call.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="font-display text-lg tracking-wider px-12 py-6 bg-primary text-primary-foreground hover:bg-kalki-gold-light glow-box-gold"
          >
            ANSWER THE CALL
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-border">
        <p className="font-display text-sm text-muted-foreground tracking-widest">
          POWERED BY THE LIGHT OF ASHVATTHAMA
        </p>
      </footer>
    </div>
  );
};

export default Index;
