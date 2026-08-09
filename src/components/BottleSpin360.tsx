import { useEffect, useMemo, useState } from "react";

/**
 * 3D cylindrical "bottle" that wraps the flat label artwork around its body
 * and slowly spins so a prospect can read every panel (ingredients,
 * supplement facts, suggested use) without manual interaction.
 *
 * Renders a CSS cylinder built from N segments. Each segment shows a vertical
 * slice of the label image via background-position-x, so when assembled the
 * texture appears continuous around the bottle.
 */

interface BottleSpin360Props {
  labelUrl: string;
  /** Cap color: clear bottles use white, white bottles also white. */
  capColor?: string;
  /** Pill/gummy fill color visible through clear bottles. Pass null for opaque bottles. */
  fillColor?: string | null;
  /** Rotation speed in seconds for one full revolution. */
  duration?: number;
}

const SEGMENTS = 28;
const BODY_HEIGHT = 360;       // visual height of label band
const BODY_DIAMETER = 240;     // visual cylinder diameter
const CAP_HEIGHT = 56;

export const BottleSpin360 = ({
  labelUrl,
  capColor = "#f5f5f5",
  fillColor = null,
  duration = 45,
}: BottleSpin360Props) => {
  const [paused, setPaused] = useState(false);

  // Geometry
  const radius = BODY_DIAMETER / 2;
  const circumference = Math.PI * BODY_DIAMETER;
  const segmentWidth = circumference / SEGMENTS;

  const segments = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => ({
        rotate: (i * 360) / SEGMENTS,
        offset: -i * segmentWidth,
      })),
    [segmentWidth]
  );

  // Inject keyframes once
  useEffect(() => {
    const id = "bottle-spin-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes bottle-spin-y {
        from { transform: rotateX(-8deg) rotateY(0deg); }
        to   { transform: rotateX(-8deg) rotateY(360deg); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const assemblyHeight = BODY_HEIGHT + CAP_HEIGHT + 40;

  return (
    <div
      className="relative w-full aspect-square flex items-center justify-center select-none overflow-hidden"
      style={{ perspective: "1400px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="img"
      aria-label="360 degree view of supplement bottle. Hover to pause."
    >
      {/* Glow halo */}
      <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      {/* Bottle assembly — absolutely centered in the panel */}
      <div
        className="absolute"
        style={{
          width: BODY_DIAMETER,
          height: assemblyHeight,
          left: "50%",
          top: "50%",
          marginLeft: -BODY_DIAMETER / 2,
          marginTop: -assemblyHeight / 2,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Cap */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-t-[14px] rounded-b-md shadow-lg"
          style={{
            width: BODY_DIAMETER * 0.78,
            height: CAP_HEIGHT,
            background: `linear-gradient(180deg, ${capColor} 0%, #c9c9c9 55%, #9a9a9a 100%)`,
            border: "1px solid rgba(0,0,0,0.18)",
            transform: "translateZ(0px)",
            zIndex: 5,
          }}
        >
          {/* cap ridges */}
          <div
            className="absolute inset-x-2 top-2 bottom-2 rounded opacity-40"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 5px)",
            }}
          />
        </div>

        {/* Cylinder (label) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: CAP_HEIGHT - 4,
            width: BODY_DIAMETER,
            height: BODY_HEIGHT,
            transformStyle: "preserve-3d",
            animation: `bottle-spin-y ${duration}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {segments.map((s, i) => (
            <div
              key={i}
              className="absolute top-0 left-1/2"
              style={{
                width: segmentWidth + 0.6, // overlap to hide seams
                height: BODY_HEIGHT,
                marginLeft: -(segmentWidth + 0.6) / 2,
                backgroundImage: `url(${labelUrl})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${circumference}px ${BODY_HEIGHT}px`,
                backgroundPosition: `${s.offset}px center`,
                transform: `rotateY(${s.rotate}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                boxShadow:
                  "inset 0 0 30px rgba(0,0,0,0.25), inset 0 0 8px rgba(255,255,255,0.05)",
              }}
            />
          ))}

          {/* Fill peeking above & below label (visible through clear bottle) */}
          {fillColor && (
            <>
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-90"
                style={{
                  top: -18,
                  width: BODY_DIAMETER * 0.92,
                  height: 30,
                  background: `radial-gradient(ellipse at center, ${fillColor} 0%, rgba(0,0,0,0.3) 80%)`,
                  filter: "blur(1px)",
                }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-90"
                style={{
                  bottom: -10,
                  width: BODY_DIAMETER * 0.92,
                  height: 26,
                  background: `radial-gradient(ellipse at center, ${fillColor} 0%, rgba(0,0,0,0.4) 80%)`,
                  filter: "blur(1px)",
                }}
              />
            </>
          )}
        </div>

        {/* Floor shadow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: -6,
            width: BODY_DIAMETER * 1.05,
            height: 26,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground bg-background/60 backdrop-blur px-2.5 py-1 rounded-full border border-border">
        360° · hover to pause
      </div>
    </div>
  );
};
