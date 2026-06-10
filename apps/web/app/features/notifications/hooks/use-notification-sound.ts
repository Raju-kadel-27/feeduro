import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "feeduro_notification_sound_enabled";
const PREF_CHANGED = "feeduro:sound-pref-changed";

export function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    const tone = (freq: number, delay: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };
    tone(880, 0, 0.25);
    tone(1047, 0.18, 0.32);
    setTimeout(() => ctx.close(), 1200);
  } catch (err) {
    console.error("[notification-sound] playback failed:", err);
  }
}

export function useNotificationSound() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  });

  useEffect(() => {
    const sync = () => {
      const v = localStorage.getItem(STORAGE_KEY);
      setSoundEnabled(v === null ? true : v === "true");
    };
    window.addEventListener(PREF_CHANGED, sync);
    return () => window.removeEventListener(PREF_CHANGED, sync);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(PREF_CHANGED));
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound };
}
