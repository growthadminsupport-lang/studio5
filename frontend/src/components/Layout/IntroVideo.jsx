import { useEffect, useRef, useState } from "react";
import "./IntroVideo.css";

/**
 * Pass a real hosted video via the `src` prop once one exists
 * (e.g. src="/videos/growth-intro.mp4"). Until then this renders
 * a "coming soon" placeholder with the same control surface wired up,
 * so swapping in the real file requires no further changes.
 */
export default function IntroVideo({ src, poster }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const seek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * duration;
  };

  const changeVolume = (e) => {
    const value = Number(e.target.value);
    setVolume(value);
    setIsMuted(value === 0);
    if (videoRef.current) videoRef.current.volume = value;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="intro-video" ref={containerRef}>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="intro-video__el"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div className="intro-video__placeholder">
          <span>Promo video &mdash; coming soon</span>
        </div>
      )}

      {!isPlaying && (
        <button type="button" className="intro-video__play-overlay" onClick={togglePlay} aria-label="Play video">
          <PlayIcon />
        </button>
      )}

      <div className="intro-video__controls">
        <button type="button" className="intro-video__btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <PauseIcon /> : <PlayIcon small />}
        </button>

        <span className="intro-video__time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="intro-video__seekbar" onClick={seek}>
          <div className="intro-video__seekbar-fill" style={{ width: `${progress}%` }} />
        </div>

        <button type="button" className="intro-video__btn" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={changeVolume}
          className="intro-video__volume"
          aria-label="Volume"
        />

        <button type="button" className="intro-video__btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
}

function PlayIcon({ small }) {
  return (
    <svg width={small ? 16 : 26} height={small ? 16 : 26} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9v6h4l5 5V4L8 9H4Z" strokeLinejoin="round" />
      <path d="M16 8a5 5 0 0 1 0 8" strokeLinecap="round" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9v6h4l5 5V4L8 9H4Z" strokeLinejoin="round" />
      <path d="M16 9l5 5M21 9l-5 5" strokeLinecap="round" />
    </svg>
  );
}
function FullscreenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ExitFullscreenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}