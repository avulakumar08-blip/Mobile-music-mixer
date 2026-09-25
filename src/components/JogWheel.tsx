import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DJDeck } from '../audio/AudioEngine';

interface JogWheelProps {
  deck: DJDeck;
  colorScheme: 'cyan' | 'magenta';
  isPlaying: boolean;
  bpm: number;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  deck,
  colorScheme,
  isPlaying,
  bpm,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const isCyan = colorScheme === 'cyan';
  const primaryColor = isCyan ? '#06b6d4' : '#ec4899';
  const glowColor = isCyan ? 'rgba(6, 182, 212, 0.4)' : 'rgba(236, 72, 153, 0.4)';

  // Calculate pointer angle from center of wheel
  const getAngle = useCallback((clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = (rad * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }, []);

  // Continuous turntable rotation during normal playback
  useEffect(() => {
    let prevTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const delta = (timestamp - prevTimestamp) / 1000;
      prevTimestamp = timestamp;

      if (isPlaying && !deck.isScratching) {
        // Standard vinyl rotation: 33 1/3 RPM = 200 deg/sec at 1.0x rate
        const speed = (200 * deck.playbackRate * delta);
        setRotation((r) => (r + speed) % 360);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, deck]);

  // Touch and Mouse Scratch Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    const angle = getAngle(e.clientX, e.clientY);
    lastAngleRef.current = angle;
    lastTimeRef.current = performance.now();
    deck.startScratch();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || lastAngleRef.current === null) return;
    const currentAngle = getAngle(e.clientX, e.clientY);
    let deltaAngle = currentAngle - lastAngleRef.current;

    // Handle crossing 0/360 boundary
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current) / 1000;
    const speed = Math.abs(deltaAngle) / dt / 100; // scratch velocity

    deck.scratchMove(deltaAngle, speed);
    setRotation((r) => (r + deltaAngle + 360) % 360);

    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    lastAngleRef.current = null;
    deck.endScratch(isPlaying);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      {/* Platter outer bezel */}
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full cursor-grab active:cursor-grabbing touch-none select-none transition-shadow duration-300 flex items-center justify-center`}
        style={{
          boxShadow: isDragging
            ? `0 0 35px ${glowColor}, inset 0 0 20px rgba(0,0,0,0.8)`
            : isPlaying
            ? `0 0 20px ${glowColor}, inset 0 0 15px rgba(0,0,0,0.8)`
            : '0 8px 24px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.8)',
          background: 'radial-gradient(circle, #1a1728 0%, #12101e 65%, #08070d 100%)',
          border: `3px solid ${isDragging ? primaryColor : '#2b273d'}`,
        }}
      >
        {/* Outer Strobe Dots Rim */}
        <div
          className="absolute inset-1 rounded-full pointer-events-none opacity-30"
          style={{
            backgroundImage: `repeating-conic-gradient(from 0deg, #444 0deg 3deg, transparent 3deg 6deg)`,
          }}
        />

        {/* Rotating Vinyl Disc */}
        <div
          className="absolute inset-3 rounded-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: 'radial-gradient(circle, #151322 0%, #0d0c15 80%, #050508 100%)',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.9)',
          }}
        >
          {/* Vinyl Micro Grooves */}
          <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-5 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-12 rounded-full border border-white/5 pointer-events-none" />

          {/* Vinyl Sheen Light Reflection */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-25"
            style={{
              background: `conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.15) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.15) 225deg, transparent 270deg)`,
            }}
          />

          {/* Center Record Label */}
          <div
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center text-center shadow-md p-1 border-2"
            style={{
              borderColor: primaryColor,
              background: isCyan
                ? 'linear-gradient(135deg, #0e7490 0%, #083344 100%)'
                : 'linear-gradient(135deg, #be185d 0%, #500724 100%)',
            }}
          >
            {/* Center Spindle Hole */}
            <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-slate-900 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>

            <div className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-white mt-0.5 truncate max-w-[70px]">
              DECK {deck.id}
            </div>
            <div className="text-[9px] font-mono text-white/80">
              {bpm} BPM
            </div>

            {/* Position Marker Needle Stripe on Record */}
            <div
              className="absolute -top-1 w-2.5 h-5 rounded-full shadow-lg"
              style={{
                backgroundColor: isDragging ? '#ffffff' : primaryColor,
                boxShadow: `0 0 10px ${primaryColor}`,
              }}
            />
          </div>
        </div>

        {/* Live Touch Indicator / Scratch Status Tag */}
        {isDragging && (
          <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold tracking-wider uppercase shadow-md animate-pulse">
            SCRATCH
          </div>
        )}
      </div>

      {/* Deck Status Label Under Wheel */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full transition-colors"
          style={{
            backgroundColor: isPlaying ? primaryColor : '#475569',
            boxShadow: isPlaying ? `0 0 8px ${primaryColor}` : 'none',
          }}
        />
        <span className="text-xs font-mono text-slate-300">
          {isPlaying ? (isDragging ? 'SCRATCHING' : 'PLAYING') : 'PAUSED'}
        </span>
      </div>
    </div>
  );
};
