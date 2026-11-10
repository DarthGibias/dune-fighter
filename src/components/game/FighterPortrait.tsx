import { useEffect, useRef } from "react";
import type { FighterDef } from "@/lib/fighters";
import { IDLE, drawFighter } from "@/game/draw";

interface Props {
  def: FighterDef;
  width: number;
  height: number;
  scale?: number;
  facing?: number;
  silhouette?: boolean;
  animate?: boolean;
  className?: string;
  testId?: string;
  cloakColor?: string;
  bladeColor?: string;
  /** Turntable spin preview (implies animate). */
  spin?: boolean;
}

/** Small canvas rendering of a fighter in idle stance. */
export default function FighterPortrait({ def, width, height, scale = 0.6, facing = 1, silhouette, animate, className, testId, cloakColor, bladeColor, spin }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const pose = { ...IDLE, crouch: IDLE.crouch + Math.sin(t * 3) * 0.03, frontArm: IDLE.frontArm + Math.sin(t * 2) * 0.06 };
      let face = facing;
      if (spin) {
        const c = Math.cos(t * 1.8);
        face = facing * (Math.abs(c) < 0.05 ? Math.sign(c || 1) * 0.05 : c);
      }
      drawFighter(ctx, def, pose, width / 2, height - 8, face, scale, { silhouette, t, cloakColor, bladeColor });
      if (animate || spin) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [def, width, height, scale, facing, silhouette, animate, cloakColor, bladeColor, spin]);

  return <canvas ref={ref} style={{ width, height }} className={className} data-testid={testId} />;
}
