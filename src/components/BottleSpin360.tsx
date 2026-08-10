import { useEffect, useMemo, useRef, useState } from "react";

interface BottleSpin360Props {
  labelUrl: string;
  capColor?: string;
  fillColor?: string | null;
  duration?: number;
}

// 64 segments for smooth cylindrical curvature
const SEGMENTS = 64; 

// Proportions tuned specifically for a 75-gummy wide-mouth vitamin bottle
const BODY_HEIGHT = 280;      // Squat, wide body (realistic for gummies)
const BODY_DIAMETER = 250;    // Wide body diameter

const HEEL_HEIGHT = 36;
const HEEL_DIAMETER = 260;    // Gentle bottom flare

const NECK_HEIGHT = 44;
const NECK_DIAMETER = 190;    // Wide mouth for easy gummies

const COLLAR_DIAMETER = 250;  // Tamper-evident safety collar
const COLLAR_HEIGHT = 70;

const CAP_HEIGHT = 44;
const CAP_DIAMETER = 206;     // Wide child-resistant ribbed cap

export const BottleSpin360 = ({
  labelUrl,
  capColor = "#2b2b2b",
  fillColor = null,
  duration = 45,
}: BottleSpin360Props) => {
  const [paused, setPaused] = useState(false);
  const [angle, setAngle] = useState(180);
  const [scale, setScale] = useState(0.72);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const autoAngle = useRef(180);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPinchDist = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const HOLD_MS = 1200;

  const clampScale = (s: number) => Math.min(2.5, Math.max(0.5, s));

  // Geometry calculations
  const bodyRadius = BODY_DIAMETER / 2;
  const bodyCircumference = Math.PI * BODY_DIAMETER;
  const bodySegmentWidth = (bodyCircumference / SEGMENTS) + 0.8;

  const heelRadius = HEEL_DIAMETER / 2;
  const heelCircumference = Math.PI * HEEL_DIAMETER;
  const heelSegmentWidth = (heelCircumference / SEGMENTS) + 0.8;

  const capRadius = CAP_DIAMETER / 2;
  const capCircumference = Math.PI * CAP_DIAMETER;
  const capSegmentWidth = (capCircumference / SEGMENTS) + 0.8;

  const neckRadius = NECK_DIAMETER / 2;
  const neckCircumference = Math.PI * NECK_DIAMETER;
  const neckSegmentWidth = (neckCircumference / SEGMENTS) + 0.8;

  const collarRadius = COLLAR_DIAMETER / 2;
  const collarCircumference = Math.PI * COLLAR_DIAMETER;
  const collarSegmentWidth = (collarCircumference / SEGMENTS) + 0.8;

  const segmentRotations = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => ({
        rotate: (i * 360) / SEGMENTS,
        offsetBody: -i * (bodyCircumference / SEGMENTS),
      })),
    [bodyCircumference]
  );

  useEffect(() => {
    const degreesPerMs = 360 / (duration * 1000);
    const FRAME_MS = 1000 / 30;
    let last: number | null = null;
    let frameLast = 0;

    const tick = (now: number) => {
      if (!dragging.current && !paused) {
        if (startTime.current === null) startTime.current = now;
        const elapsed = now - startTime.current;
        if (elapsed > HOLD_MS && now - frameLast >= FRAME_MS) {
          const delta = last !== null ? now - last : 0;
          autoAngle.current = (autoAngle.current + degreesPerMs * delta) % 360;
          setAngle(autoAngle.current);
          frameLast = now;
        }
      }
      last = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, duration]);

  const startDrag = (clientX: number) => {
    dragging.current = true;
    lastX.current = clientX;
    setPaused(true);
  };

  const moveDrag = (clientX: number) => {
    if (!dragging.current) return;
    const dx = clientX - lastX.current;
    lastX.current = clientX;
    autoAngle.current = (autoAngle.current + dx * 0.4) % 360;
    setAngle(autoAngle.current);
  };

  const endDrag = () => {
    dragging.current = false;
    lastPinchDist.current = null;
    setPaused(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist.current !== null) {
        setScale((s) => clampScale(s * (dist / lastPinchDist.current!)));
      }
      lastPinchDist.current = dist;
    } else {
      moveDrag(e.touches[0].clientX);
    }
  };

  const webpUrl = labelUrl.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  const totalAssemblyHeight = CAP_HEIGHT + NECK_HEIGHT + BODY_HEIGHT + HEEL_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square flex items-center justify-center select-none overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ perspective: "1400px" }}
      onMouseDown={(e) => startDrag(e.clientX)}
      onMouseMove={(e) => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={(e) => e.touches.length === 1 && startDrag(e.touches[0].clientX)}
      onTouchMove={onTouchMove}
      onTouchEnd={endDrag}
      role="img"
      aria-label="360° view of vitamin gummy supplement bottle. Drag to spin."
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          className="w-7 h-7 rounded-full bg-background/70 backdrop-blur border border-border text-primary font-bold text-sm flex items-center justify-center hover:bg-background transition-colors"
          onClick={() => setScale((s) => clampScale(s + 0.2))}
          aria-label="Zoom in"
        >+</button>
        <button
          className="w-7 h-7 rounded-full bg-background/70 backdrop-blur border border-border text-primary font-bold text-sm flex items-center justify-center hover:bg-background transition-colors"
          onClick={() => setScale((s) => clampScale(s - 0.2))}
          aria-label="Zoom out"
        >−</button>
      </div>

      {/* Ambient background glow */}
      <div className="absolute inset-10 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Main 3D Container */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: BODY_DIAMETER,
          height: totalAssemblyHeight,
          transformStyle: "preserve-3d",
          transform: `scale(${scale}) rotateX(-7deg) rotateY(${angle}deg)`,
          transition: dragging.current ? "none" : "transform 0.1s ease-out",
        }}
      >
        {/* ================= WIDE CHILD-RESISTANT CAP ================= */}
        <div
          className="absolute"
          style={{
            top: 0,
            width: CAP_DIAMETER,
            height: CAP_HEIGHT,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Cap Top Surface (matte plastic with light reflection) */}
          <div
            className="absolute rounded-full"
            style={{
              width: CAP_DIAMETER,
              height: CAP_DIAMETER,
              top: -capRadius,
              left: 0,
              background: `radial-gradient(circle at 30% 30%, #f0f0f0 0%, ${capColor} 55%, #afafaf80 95%)`,
              transform: "rotateX(90deg)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)",
            }}
          />

          {/* Cap Side Mesh (ribbed plastic look) */}
          {segmentRotations.map((s, i) => (
            <div
              key={`cap-${i}`}
              className="absolute top-0 left-1/2"
              style={{
                width: capSegmentWidth,
                height: CAP_HEIGHT,
                marginLeft: -capSegmentWidth / 2,
                background: `linear-gradient(180deg, ${capColor} 0%, #d6d6d6 45%, #a5a5a5 100%)`,
                transform: `rotateY(${s.rotate}deg) translateZ(${capRadius}px)`,
                backfaceVisibility: "hidden",
              }}
            />
          ))}
        </div>

        {/* ================= NECK + TAMPER-EVIDENT COLLAR ================= */}
        <div
          className="absolute"
          style={{
            top: CAP_HEIGHT - 1,
            width: NECK_DIAMETER,
            height: NECK_HEIGHT,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Neck Mesh */}
          {segmentRotations.map((s, i) => (
            <div
              key={`neck-${i}`}
              className="absolute top-0 left-1/2"
              style={{
                width: neckSegmentWidth,
                height: NECK_HEIGHT,
                marginLeft: -neckSegmentWidth / 2,
                background: "linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 55%, #555555 100%)",
                transform: `rotateY(${s.rotate}deg) translateZ(${neckRadius}px)`,
                backfaceVisibility: "hidden",
              }}
            />
          ))}

          {/* Solid 3D Tamper-Evident Collar */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: 8,
              width: COLLAR_DIAMETER,
              height: COLLAR_HEIGHT,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Top Collar Disc */}
            <div
              className="absolute rounded-full"
              style={{
                width: COLLAR_DIAMETER,
                height: COLLAR_DIAMETER,
                top: -collarRadius,
                left: 0,
                background: "radial-gradient(circle at 30% 25%, #ffffff 0%, #c0c0c0 50%, #555555 95%)",
                transform: "rotateX(90deg)",
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.5)",
              }}
            />

            {/* Collar Wall Segments */}
            {segmentRotations.map((s, i) => (
              <div
                key={`collar-${i}`}
                className="absolute top-0 left-1/2"
                style={{
                  width: collarSegmentWidth,
                  height: COLLAR_HEIGHT,
                  marginLeft: -collarSegmentWidth / 2,
                  background: "linear-gradient(180deg, #f5f5f5 0%, #b0b0b0 45%, #444444 100%)",
                  transform: `rotateY(${s.rotate}deg) translateZ(${collarRadius}px)`,
                }}
              />
            ))}

            {/* Bottom Collar Disc */}
            <div
              className="absolute rounded-full"
              style={{
                width: COLLAR_DIAMETER,
                height: COLLAR_DIAMETER,
                top: COLLAR_HEIGHT - collarRadius,
                left: 0,
                background: "radial-gradient(circle at center, #222222 0%, #000000 80%)",
                transform: "rotateX(90deg)",
              }}
            />
          </div>
        </div>

        {/* ================= MAIN BOTTLE BODY + LABEL ================= */}
        <div
          className="absolute"
          style={{
            top: CAP_HEIGHT + NECK_HEIGHT - 2,
            width: BODY_DIAMETER,
            height: BODY_HEIGHT,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Shoulder Transition Disc */}
          <div
            className="absolute rounded-full"
            style={{
              width: BODY_DIAMETER,
              height: BODY_DIAMETER,
              top: -bodyRadius,
              left: 0,
              background: "radial-gradient(circle at center, #b8b8b8 0%, #3a3a3a 70%)",
              transform: "rotateX(90deg)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)",
            }}
          />

          {/* Body Mesh with Label (the label image is wrapped around the cylinder) */}
          {segmentRotations.map((s, i) => (
            <div
              key={`body-${i}`}
              className="absolute top-0 left-1/2"
              style={{
                width: bodySegmentWidth,
                height: BODY_HEIGHT,
                marginLeft: -bodySegmentWidth / 2,
                backgroundImage: `url(${webpUrl})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${bodyCircumference}px ${BODY_HEIGHT}px`,
                backgroundPosition: `${s.offsetBody}px center`,
                transform: `rotateY(${s.rotate}deg) translateZ(${bodyRadius}px)`,
                backfaceVisibility: "hidden",
              }}
            />
          ))}

          {/* Realistic Lighting + Gloss Overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(255,255,255,0.18) 22%, rgba(255,255,255,0.06) 48%, rgba(0,0,0,0.55) 100%)",
              transform: "translateZ(1px)",
            }}
          />

          {/* Optional fill color highlight (e.g., gummies visible through top) */}
          {fillColor && (
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-75 pointer-events-none"
              style={{
                top: -14,
                width: BODY_DIAMETER * 0.93,
                height: 22,
                background: `radial-gradient(ellipse at center, ${fillColor} 0%, rgba(0,0,0,0.5) 80%)`,
                filter: "blur(1.5px)",
              }}
            />
          )}
        </div>

        {/* ================= TAPERED HEEL / BASE ================= */}
        <div
          className="absolute"
          style={{
            top: CAP_HEIGHT + NECK_HEIGHT + BODY_HEIGHT - 3,
            width: HEEL_DIAMETER,
            height: HEEL_HEIGHT,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Heel Side Mesh */}
          {segmentRotations.map((s, i) => (
            <div
              key={`heel-${i}`}
              className="absolute top-0 left-1/2"
              style={{
                width: heelSegmentWidth,
                height: HEEL_HEIGHT,
                marginLeft: -heelSegmentWidth / 2,
                background: "linear-gradient(180deg, #f0f0f0 0%, #b0b0b0 50%, #444444 100%)",
                transform: `rotateY(${s.rotate}deg) translateZ(${heelRadius}px)`,
                backfaceVisibility: "hidden",
              }}
            />
          ))}

          {/* Bottom Base Disc (with realistic shadow) */}
          <div
            className="absolute rounded-full"
            style={{
              width: HEEL_DIAMETER,
              height: HEEL_DIAMETER,
              top: HEEL_HEIGHT - heelRadius,
              left: 0,
              background: "radial-gradient(circle at center, #111111 0%, #1f1f1f 65%, #0a0a0a 95%)",
              transform: "rotateX(90deg)",
              boxShadow: "inset 0 0 25px rgba(0,0,0,0.95)",
            }}
          />
        </div>

        {/* Wide Floor Shadow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: totalAssemblyHeight + 6,
            width: BODY_DIAMETER * 1.2,
            height: 28,
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 78%)",
            filter: "blur(5px)",
            transform: "rotateX(85deg)",
          }}
        />
      </div>

      {/* Preload image */}
      <img src={webpUrl} alt="" loading="lazy" className="sr-only" aria-hidden="true" />

      {/* Hint Badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground bg-background/60 backdrop-blur px-2.5 py-1 rounded-full border border-border pointer-events-none">
        360° · drag to spin
      </div>
    </div>
  );
};