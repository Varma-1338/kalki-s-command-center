import { Volume2, VolumeX } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import { Button } from "@/components/ui/button";

const MuteButton = () => {
  const { isMuted, toggleMute } = useAudio();

  return (
    <Button
      onClick={toggleMute}
      variant="ghost"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-card text-foreground"
      aria-label={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </Button>
  );
};

export default MuteButton;
