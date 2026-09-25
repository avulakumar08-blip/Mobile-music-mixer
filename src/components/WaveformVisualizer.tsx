import React, { useRef, useEffect } from 'react';
import { DJDeck } from '../audio/AudioEngine';

interface WaveformVisualizerProps {
  deck: DJDeck;
  colorScheme: 'cyan' | 'magenta';
  isPlaying: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  deck,
  colorScheme,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const isCyan = colorScheme === 'cyan';
  const primaryStroke = isCyan ? '#06b6d4' : '#ec4899';
  const gradientStart = isCyan ? 'rgba(6, 182, 212, 0.7)' : 'rgba(236, 72, 153, 0.7)';
  const gradientEnd = isCyan ? 'rgba(6, 182, 212, 0.05)' : 'rgba(236, 72, 153, 0.05)';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 300);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 60);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 300;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 60;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid lines
      ctx.fillStyle = '#0f0d1b';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      const midY = height / 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      const waveData = deck.getWaveformData();
      const bufferLength = waveData.length;

      // Draw mirrored waveform
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.strokeStyle = primaryStroke;

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, gradientStart);
      grad.addColorStop(0.5, gradientEnd);
      grad.addColorStop(1, gradientStart);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, midY);

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = waveData[i] / 128.0; // 0 to 2, 1 is center
        const y = v * (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, midY);
      ctx.stroke();

      // Draw Playhead progress bar
      if (deck.buffer && deck.buffer.duration > 0) {
        const progress = deck.getCurrentTime() / deck.buffer.duration;
        const playheadX = Math.max(0, Math.min(width, progress * width));

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = primaryStroke;
        ctx.shadowBlur = 8;
        ctx.fillRect(playheadX - 1.5, 0, 3, height);
        ctx.shadowBlur = 0;

        // Loop region overlay
        if (deck.loopActive) {
          const secPerBeat = 60 / deck.bpm;
          const loopLenSec = deck.loopBeats * secPerBeat;
          const loopStartX = playheadX;
          const loopWidthPx = (loopLenSec / deck.buffer.duration) * width;
          ctx.fillStyle = isCyan ? 'rgba(6, 182, 212, 0.25)' : 'rgba(236, 72, 153, 0.25)';
          ctx.fillRect(loopStartX, 0, loopWidthPx, height);
          ctx.strokeStyle = '#facc15';
          ctx.strokeRect(loopStartX, 0, loopWidthPx, height);
        }

        // Hot cue markers on waveform
        deck.hotCues.forEach((cuePos, idx) => {
          if (cuePos !== null) {
            const cueX = (cuePos / deck.buffer!.duration) * width;
            ctx.fillStyle = ['#38bdf8', '#a855f7', '#f43f5e', '#34d399'][idx];
            ctx.beginPath();
            ctx.moveTo(cueX, 0);
            ctx.lineTo(cueX + 6, 8);
            ctx.lineTo(cueX - 6, 8);
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [deck, primaryStroke, gradientStart, gradientEnd, isCyan]);

  return (
    <div className="relative w-full h-14 sm:h-16 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-[#0b0a14]">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Time and Track Info Overlay */}
      <div className="absolute top-1 left-2 flex items-center gap-1.5 text-[10px] font-mono text-white/70 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryStroke }} />
        <span className="truncate max-w-[120px] font-semibold">{deck.name}</span>
      </div>
      <div className="absolute top-1 right-2 text-[10px] font-mono text-white/80 pointer-events-none">
        {formatTime(deck.getCurrentTime())} / {formatTime(deck.buffer?.duration || 0)}
      </div>
    </div>
  );
};

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
