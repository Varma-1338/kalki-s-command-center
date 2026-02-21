import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AudioContextType = {
  isMuted: boolean;
  toggleMute: () => void;
};

const AudioCtx = createContext<AudioContextType>({ isMuted: false, toggleMute: () => {} });

export const useAudio = () => useContext(AudioCtx);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("kalki-muted") === "true");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch audio URL from app_settings
  useEffect(() => {
    const fetchAudio = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "background_audio_url")
        .maybeSingle();
      if (data?.value) setAudioUrl(data.value);
    };
    fetchAudio();

    // Listen for realtime changes
    const channel = supabase
      .channel("app_settings_audio")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: "key=eq.background_audio_url" }, (payload: any) => {
        if (payload.new?.value) setAudioUrl(payload.new.value);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Manage audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = 0.3;
    audio.muted = isMuted;
    audioRef.current = audio;

    // Try to autoplay, handle browser restrictions
    const playAudio = () => {
      audio.play().catch(() => {
        // Browser blocked autoplay, play on first interaction
        const handleInteraction = () => {
          audio.play().catch(() => {});
          document.removeEventListener("click", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
      });
    };
    playAudio();

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Sync mute state
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    localStorage.setItem("kalki-muted", String(isMuted));
  }, [isMuted]);

  const toggleMute = () => setIsMuted((prev) => !prev);

  return <AudioCtx.Provider value={{ isMuted, toggleMute }}>{children}</AudioCtx.Provider>;
};
