import type { Build, FighterDef, Look, Outfit } from "@/lib/fighters";

export const VW = 1280;
export const VH = 720;
export const GROUND = 610;

export interface Pose {
  lean: number;
  crouch: number;
  frontArm: number;
  frontFore: number;
  backArm: number;
  backFore: number;
  frontLeg: number;
  frontKnee: number;
  backLeg: number;
  backKnee: number;
  weapon: number;
  glow: number;
  down: number;
  flutter: number;
}

export const IDLE: Pose = {
  lean: 0.05,
  crouch: 0.08,
  frontArm: 0.55,
  frontFore: 0.9,
  backArm: -0.15,
  backFore: 0.7,
  frontLeg: 0.22,
  frontKnee: 0.2,
  backLeg: -0.22,
  backKnee: 0.15,
  weapon: 0,
  glow: 0,
  down: 0,
  flutter: 0,
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function blend(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
}

function limb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a1: number,
  l1: number,
  a2: number,
  l2: number,
  w: number,
  color: string,
) {
  const kx = x + Math.sin(a1) * l1;
  const ky = y + Math.cos(a1) * l1;
  const ex = kx + Math.sin(a2) * l2;
  const ey = ky + Math.cos(a2) * l2;

  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  return { ex, ey, a2 };
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

type BuildDims = {
  sh: number;
  waist: number;
  hip: number;
  arm: number;
  leg: number;
  head: number;
};

const BUILDS: Record<Build, BuildDims> = {
  slim: { sh: 15, waist: 12, hip: 14, arm: 10, leg: 13, head: 16 },
  lean: { sh: 17, waist: 14, hip: 15, arm: 11, leg: 14, head: 17 },
  athletic: { sh: 19, waist: 15, hip: 16, arm: 13, leg: 15, head: 17 },
  heavy: { sh: 23, waist: 20, hip: 20, arm: 15, leg: 17, head: 19 },
  obese: { sh: 26, waist: 34, hip: 30, arm: 16, leg: 19, head: 21 },
  child: { sh: 14, waist: 12, hip: 13, arm: 10, leg: 12, head: 17 },
};

const DEFAULT_LOOK: Look = {
  build: "lean",
  hair: "short",
  outfit: "stillsuit",
};

const FREMEN = "#2CD4F5";
const LONG_SKIRT = new Set(["gown", "bg-robe", "suk"]);
const GLOVED = new Set(["stillsuit", "harkonnen", "sardaukar", "sandtrout"]);
const HIGH_COLLAR = new Set(["harkonnen", "sardaukar", "imperial", "suk", "atreides", "mentat"]);
const PAULDRON = new Set(["atreides", "sardaukar", "imperial", "harkonnen"]);

/** Clayface's muddy, cracked surface texture. */
function drawClayfaceTexture(
  ctx: CanvasRenderingContext2D,
  B: BuildDims,
  T: number,
  t: number,
) {
  ctx.save();

  ctx.fillStyle = "rgba(190,145,95,0.22)";

  for (let i = 0; i < 12; i++) {
    const x = Math.sin(i * 12.4) * B.sh;
    const y = -T + 12 + ((i * 17) % 55);

    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.sin(t * 2 + i) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(55,35,22,0.65)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 5; i++) {
    const x = Math.sin(i * 8.3) * B.sh * 0.65;
    const y = -T + 18 + i * 10;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y + 7);
    ctx.lineTo(x - 2, y + 13);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw a vector fighter with feet at (x, y). */
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  def: FighterDef,
  pose: Pose,
  x: number,
  y: number,
  facing: number,
  scale = 1,
  opts: {
    flash?: number;
    shield?: boolean;
    poisoned?: boolean;
    frozen?: boolean;
    silhouette?: boolean;
    t?: number;
    cloakColor?: string;
    bladeColor?: string;
  } = {},
) {
  const p = def.palette;
  const L = def.look ?? DEFAULT_LOOK;

  const isClayface = def.id === "clayface";
  const isGreenLantern = def.id === "greenlantern";

  const B = { ...BUILDS[L.build] };
  const fem = !!L.female;
  const adultFem = fem && L.build !== "child";

  if (adultFem) {
    B.waist -= 2;
    B.hip += 2;
  }

  const sil = opts.silhouette;
  const hasCloakPiece =
    def.hood ||
    def.robe ||
    !!L.cape ||
    def.id === "paul" ||
    def.id === "gurney";

  const cloak = opts.cloakColor || p.cloak;

  const suit = isClayface
    ? "#806044"
    : (!hasCloakPiece && opts.cloakColor) || p.suit;

  const col = (c: string) => (sil ? "#0b0705" : c);
  const t = opts.t ?? 0;

  const LEG = 62;
  const TORSO = 70;
  const mirror = facing < 0 ? -1 : 1;
  const outfit = L.outfit;

  const boot = isGreenLantern
    ? "#087A42"
    : isClayface
      ? "#59402F"
      : outfit === "super"
        ? "#B3121B"
        : outfit === "gown"
          ? shade(suit, -30)
          : shade(suit, -50);

  const glove = isClayface
    ? "#96704F"
    : isGreenLantern
      ? "#087A42"
      : GLOVED.has(outfit)
        ? shade(suit, -40)
        : p.skin;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);

  // shadow
  if (!sil) {
    ctx.fillStyle = "rgba(20,8,2,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 52, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (L.build === "child") ctx.scale(0.84, 0.84);

  if (L.float) {
    const bob = Math.sin(t * 2) * 4;

    if (!sil) {
      ctx.fillStyle = "rgba(255,170,90,0.28)";

      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.ellipse(i ? 14 : -14, -6, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.translate(0, -16 + bob);
  }

  if (pose.down > 0) {
    ctx.translate(-pose.down * 30, 0);
    ctx.rotate(-pose.down * 1.45);
  }

  const crouch = pose.crouch;
  const hipY = -(LEG * 2) * (1 - crouch * 0.4);
  const hipX = 0;
  const sx = hipX + Math.sin(pose.lean) * TORSO;
  const sy = hipY - Math.cos(pose.lean) * TORSO;

  // cape / cloak
  if (hasCloakPiece) {
    const fl = Math.sin(t * 3 + pose.flutter) * 8 + pose.flutter * 10;
    const cape = !!L.cape;
    const len = cape ? -4 : -8;
    const reach = cape ? 58 : 46;

    ctx.fillStyle = col(shade(cloak, -18));
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy + 2);
    ctx.quadraticCurveTo(-34 - fl, hipY + 10, -reach - fl * 1.6, len - Math.abs(fl) * 0.4);
    ctx.quadraticCurveTo(-28 - fl, len + 6, -10 - fl * 0.5, len + 2);
    ctx.lineTo(hipX - 2, hipY + 20);
    ctx.lineTo(sx + 6, sy + 4);
    ctx.closePath();
    ctx.fill();

    if (!sil) {
      ctx.strokeStyle = shade(cloak, -40);
      ctx.lineWidth = 1.6;

      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sx - 4 - i * 3, sy + 10);
        ctx.quadraticCurveTo(
          -18 - i * 8 - fl * 0.6,
          hipY + 20,
          -14 - i * 10 - fl * (0.6 + i * 0.3),
          len - 4,
        );
        ctx.stroke();
      }

      ctx.strokeStyle = shade(cloak, 25);
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy + 4);
      ctx.quadraticCurveTo(-30 - fl, hipY + 8, -reach - fl * 1.6, len - Math.abs(fl) * 0.4);
      ctx.stroke();
    }
  }

  // back arm
  const back = limb(
    ctx,
    sx - 4,
    sy + 6,
    pose.backArm,
    34,
    pose.backArm + pose.backFore,
    32,
    B.arm,
    col(isClayface ? "#96704F" : shade(suit, -22)),
  );

  ctx.fillStyle = col(isClayface ? "#96704F" : shade(glove, -20));
  ctx.beginPath();
  ctx.arc(back.ex, back.ey, B.arm * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // legs
  const legDark = shade(suit, -28);
  const bl = limbJ(pose.backLeg, pose.backLeg - pose.backKnee, hipX - 3, hipY, LEG);
  const fl2 = limbJ(pose.frontLeg, pose.frontLeg - pose.frontKnee, hipX + 3, hipY, LEG);

  if (!LONG_SKIRT.has(outfit)) {
    strokeLeg(ctx, bl, B.leg, col(legDark), col(shade(boot, -15)), outfit);
    strokeLeg(ctx, fl2, B.leg, col(suit), col(boot), outfit);

    if (!sil && outfit === "stillsuit") {
      ctx.fillStyle = shade(suit, 18);
      ctx.beginPath();
      ctx.arc(fl2.kx + 2, fl2.ky, B.leg * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!sil && (outfit === "sardaukar" || outfit === "atreides")) {
      ctx.fillStyle = shade(suit, 22);
      ctx.beginPath();
      ctx.ellipse(fl2.kx + 3, fl2.ky, B.leg * 0.55, B.leg * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = col(boot);

    for (const j of [bl, fl2]) {
      ctx.beginPath();
      ctx.ellipse(j.ex + 6, j.ey - 3, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // skirts
  if (LONG_SKIRT.has(outfit)) {
    const sw = Math.sin(t * 2.2) * 3;
    const skirt = outfit === "gown" ? suit : outfit === "bg-robe" ? cloak : suit;
    const g = sil ? null : ctx.createLinearGradient(-40, 0, 40, 0);

    if (g) {
      g.addColorStop(0, shade(skirt, -30));
      g.addColorStop(0.55, skirt);
      g.addColorStop(1, shade(skirt, 18));
    }

    ctx.fillStyle = g ?? col(skirt);
    ctx.beginPath();
    ctx.moveTo(hipX - B.hip - 2, hipY - 10);
    ctx.lineTo(hipX + B.hip + 2, hipY - 10);
    ctx.quadraticCurveTo(hipX + 30, hipY * 0.45, hipX + 40 + sw, -6);

    for (let i = 4; i >= -4; i--) {
      ctx.lineTo(hipX + i * 10 + sw * (i / 4), -6 + (i % 2 === 0 ? 0 : 4));
    }

    ctx.quadraticCurveTo(hipX - 28, hipY * 0.45, hipX - B.hip - 2, hipY - 10);
    ctx.closePath();
    ctx.fill();

    if (!sil) {
      ctx.strokeStyle = shade(skirt, -38);
      ctx.lineWidth = 1.5;

      for (const k of [-18, -4, 10, 24]) {
        ctx.beginPath();
        ctx.moveTo(hipX + k * 0.35, hipY - 4);
        ctx.quadraticCurveTo(hipX + k * 0.8, hipY * 0.5, hipX + k + sw * 0.5, -8);
        ctx.stroke();
      }

      if (outfit === "gown" || outfit === "bg-robe") {
        ctx.strokeStyle = outfit === "gown" ? "#F5D77A" : shade(p.accent, -10);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hipX - 40 + sw, -9);
        ctx.lineTo(hipX + 40 + sw, -9);
        ctx.stroke();
      }
    }
  } else if (def.robe) {
    ctx.fillStyle = col(cloak);
    ctx.beginPath();
    ctx.moveTo(hipX - 18, hipY - 8);
    ctx.lineTo(hipX + 18, hipY - 8);
    ctx.lineTo(hipX + 34 + Math.sin(t * 2.4) * 3, -8);
    ctx.lineTo(hipX - 34 + Math.sin(t * 2.4 + 1) * 3, -8);
    ctx.closePath();
    ctx.fill();
  }

  // torso
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.lean);

  const T = TORSO;

  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(-B.sh + 6, -T - 4);
    ctx.quadraticCurveTo(-B.sh, -T - 3, -B.sh, -T + 6);
    ctx.quadraticCurveTo(-B.sh - 1, -T * 0.55, -B.waist, -T * 0.32);
    ctx.quadraticCurveTo(-B.hip, -10, -B.hip, 8);
    ctx.lineTo(B.hip, 8);
    ctx.quadraticCurveTo(B.hip, -10, B.waist, -T * 0.32);

    if (L.build === "obese") {
      ctx.bezierCurveTo(B.waist + 12, -T * 0.42, B.sh + 6, -T * 0.7, B.sh, -T * 0.86);
    } else if (adultFem) {
      ctx.quadraticCurveTo(B.waist + 1, -T * 0.48, B.sh - 1, -T * 0.56);
      ctx.bezierCurveTo(B.sh + 7, -T * 0.6, B.sh + 6, -T * 0.8, B.sh - 1, -T * 0.84);
    } else {
      ctx.quadraticCurveTo(B.sh + 1, -T * 0.5, B.sh, -T * 0.85);
    }

    ctx.quadraticCurveTo(B.sh, -T - 3, B.sh - 6, -T - 4);
    ctx.closePath();
  };

  const tg = sil ? null : ctx.createLinearGradient(-B.sh, 0, B.sh + 6, 0);

  if (tg) {
    tg.addColorStop(0, shade(suit, -28));
    tg.addColorStop(0.55, suit);
    tg.addColorStop(1, shade(suit, 22));
  }

  ctx.fillStyle = tg ?? col(suit);
  torsoPath();
  ctx.fill();

  if (!sil) {
    ctx.save();
    torsoPath();
    ctx.clip();

    if (isClayface) {
      drawClayfaceTexture(ctx, B, T, t);
    } else {
      drawOutfit(ctx, outfit, suit, p.accent, B, T, t, adultFem, isGreenLantern);
    }

    ctx.restore();

    // belt
    const beltCol =
      outfit === "super"
        ? "#F8C630"
        : outfit === "imperial" || outfit === "gown"
          ? "#D4A93A"
          : shade(suit, -38);

    ctx.fillStyle = beltCol;
    ctx.fillRect(-B.waist - 2, -14, (B.waist + 2) * 2, 7);

    if (outfit === "stillsuit" || outfit === "sardaukar" || outfit === "atreides") {
      ctx.fillStyle = shade(suit, -15);
      ctx.fillRect(B.waist - 8, -13, 7, 11);
      ctx.fillRect(-B.waist, -13, 7, 10);
    }

    ctx.fillStyle = outfit === "super" && !isGreenLantern ? "#C21D25" : p.accent;
    ctx.fillRect(-4, -14, 8, 7);

    if (isGreenLantern) {
      drawGreenLanternEmblem(
        ctx,
        adultFem ? 2 : 4,
        -T * 0.68 + (adultFem ? -4 : 0),
      );
    } else if (L.emblem) {
      drawEmblem(
        ctx,
        L.emblem,
        adultFem ? 2 : 4,
        -T * 0.68 + (adultFem ? -4 : 0),
        mirror,
        p.accent,
      );
    }
  }

  // cloak / mantle over shoulders
  if (def.hood || def.robe) {
    ctx.fillStyle = col(cloak);
    ctx.beginPath();
    ctx.moveTo(-B.sh - 3, -T + 2);
    ctx.lineTo(B.sh + 3, -T + 2);
    ctx.lineTo(B.sh - 3, -T + 24);
    ctx.lineTo(-B.sh - 5, -T + 34);
    ctx.closePath();
    ctx.fill();

    if (!sil) {
      ctx.strokeStyle = shade(cloak, -30);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-B.sh, -T + 10);
      ctx.lineTo(B.sh - 4, -T + 18);
      ctx.stroke();
    }
  }

  ctx.restore();

  // head
  const hx = sx + Math.sin(pose.lean) * 22;
  const hy = sy - Math.cos(pose.lean) * 22;
  const r = B.head;

  // neck
  ctx.fillStyle = col(HIGH_COLLAR.has(outfit) ? shade(suit, -10) : p.skin);
  ctx.beginPath();
  ctx.roundRect(sx - 6, hy + r * 0.4, 12, sy - hy - r * 0.2, 4);
  ctx.fill();

  drawHead(ctx, def, L, hx, hy, r, cloak, suit, t, !!opts.frozen, !!sil, col);

  // front arm
  const arm = limb(
    ctx,
    sx + 4,
    sy + 6,
    pose.frontArm,
    34,
    pose.frontArm + pose.frontFore,
    32,
    B.arm,
    col(isClayface ? "#96704F" : shade(suit, 12)),
  );

  if (!sil && (outfit === "gown" || outfit === "imperial")) {
    ctx.strokeStyle = "#D4A93A";
    ctx.lineWidth = B.arm + 1;
    ctx.lineCap = "butt";

    const ca = arm.a2;
    ctx.beginPath();
    ctx.moveTo(arm.ex - Math.sin(ca) * 8, arm.ey - Math.cos(ca) * 8);
    ctx.lineTo(arm.ex - Math.sin(ca) * 4, arm.ey - Math.cos(ca) * 4);
    ctx.stroke();
  }

  if (PAULDRON.has(outfit) || outfit === "super") {
    if (outfit !== "super") {
      ctx.fillStyle = col(shade(suit, outfit === "imperial" ? 0 : 18));
      ctx.beginPath();
      ctx.ellipse(sx + 3, sy + 8, B.arm * 0.95, B.arm * 0.7, -0.3, 0, Math.PI * 2);
      ctx.fill();

      if (!sil) {
        ctx.strokeStyle = outfit === "imperial" ? "#D4A93A" : shade(suit, 40);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = col(glove);
  ctx.beginPath();
  ctx.arc(arm.ex, arm.ey, B.arm * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Green Lantern energy ring
  if (!sil && isGreenLantern) {
    ctx.save();
    ctx.shadowColor = "#39FF88";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#39FF88";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(arm.ex, arm.ey, B.arm * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (!sil) {
    drawWeapon(ctx, def, arm.ex, arm.ey, arm.a2 + pose.weapon, pose.glow, opts.bladeColor);
  }

  // shield bubble
  if (opts.shield) {
    ctx.strokeStyle = "rgba(96,165,250,0.85)";
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, hipY - 20, 70, 130, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // flash overlay
  if (opts.flash && opts.flash > 0 && !sil) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, opts.flash);
    ctx.fillStyle = "#fff4e8";
    ctx.beginPath();
    ctx.ellipse(x, y - 120 * scale, 42 * scale, 120 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // poison particles
  if (opts.poisoned && !sil) {
    ctx.save();
    ctx.fillStyle = "rgba(132,204,22,0.7)";

    for (let i = 0; i < 4; i++) {
      const a = t * 2 + i * 1.6;
      ctx.beginPath();
      ctx.arc(
        x + Math.sin(a) * 30 * scale,
        y - (60 + ((t * 60 + i * 40) % 160)) * scale,
        4 * scale,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }
}

type Joint = {
  x: number;
  y: number;
  kx: number;
  ky: number;
  ex: number;
  ey: number;
};

function limbJ(a1: number, a2: number, x: number, y: number, l: number): Joint {
  const kx = x + Math.sin(a1) * l;
  const ky = y + Math.cos(a1) * l;

  return {
    x,
    y,
    kx,
    ky,
    ex: kx + Math.sin(a2) * l,
    ey: ky + Math.cos(a2) * l,
  };
}

function strokeLeg(
  ctx: CanvasRenderingContext2D,
  j: Joint,
  w: number,
  color: string,
  bootCol: string,
  outfit: Outfit,
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(j.x, j.y);
  ctx.lineTo(j.kx, j.ky);
  ctx.lineTo(j.ex, j.ey);
  ctx.stroke();

  const k = outfit === "super" ? 0.92 : 0.45;

  ctx.strokeStyle = bootCol;
  ctx.lineWidth = w + 1.5;
  ctx.beginPath();
  ctx.moveTo(
    j.ex + (j.kx - j.ex) * k,
    j.ey + (j.ky - j.ey) * k,
  );
  ctx.lineTo(j.ex, j.ey);
  ctx.stroke();

  ctx.fillStyle = bootCol;
  ctx.beginPath();
  ctx.ellipse(j.ex + 6, j.ey - 2, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Costume detailing inside the clipped torso. */
function drawOutfit(
  ctx: CanvasRenderingContext2D,
  outfit: Outfit,
  suit: string,
  accent: string,
  B: BuildDims,
  T: number,
  t: number,
  fem: boolean,
  isGreenLantern = false,
) {
  const W = B.sh + 12;
  ctx.lineCap = "round";

  switch (outfit) {
    case "stillsuit": {
      ctx.strokeStyle = shade(suit, -22);
      ctx.lineWidth = 1.4;

      for (let yy = -T + 10; yy < -16; yy += 7) {
        ctx.beginPath();
        ctx.moveTo(-W, yy);
        ctx.quadraticCurveTo(0, yy + 3, W, yy);
        ctx.stroke();
      }

      ctx.strokeStyle = shade(suit, 34);
      ctx.lineWidth = 2.6;

      for (const o of [-5, 3]) {
        ctx.beginPath();
        ctx.moveTo(B.sh - 6 + o * 0.3, -T + 2);
        ctx.bezierCurveTo(B.sh + 2 + o, -T * 0.62, o, -T * 0.35, -2 + o, -14);
        ctx.stroke();
      }

      ctx.fillStyle = shade(suit, -35);
      ctx.fillRect(-W, -T - 6, W * 2, 7);
      break;
    }

    case "atreides":
    case "mentat": {
      ctx.strokeStyle = shade(suit, 28);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(B.sh * 0.35, -T - 2);
      ctx.lineTo(B.sh * 0.2, -14);
      ctx.stroke();

      ctx.fillStyle = shade(suit, 45);

      for (let yy = -T + 10; yy < -18; yy += 11) {
        ctx.beginPath();
        ctx.arc(B.sh * 0.3, yy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (outfit === "mentat") {
        ctx.strokeStyle = shade(accent, -10);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-W, -T + 6);
        ctx.lineTo(W, -24);
        ctx.stroke();
      }

      ctx.fillStyle = shade(suit, -30);
      ctx.fillRect(-W, -T - 6, W * 2, 8);
      break;
    }

    case "harkonnen": {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;

      for (let yy = -T + 14; yy < -14; yy += 10) {
        ctx.beginPath();
        ctx.moveTo(-W, yy);
        ctx.lineTo(W, yy - 2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(B.sh - 4, -T + 6);
      ctx.lineTo(B.sh - 10, -20);
      ctx.stroke();

      ctx.fillStyle = "#050505";
      ctx.fillRect(-W, -T - 6, W * 2, 9);
      break;
    }

    case "sardaukar": {
      ctx.fillStyle = shade(suit, 16);
      ctx.beginPath();
      ctx.ellipse(B.sh * 0.3, -T * 0.66, B.sh * 0.95, T * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;

      for (let yy = -T * 0.38; yy < -14; yy += 8) {
        ctx.beginPath();
        ctx.moveTo(-W, yy);
        ctx.lineTo(W, yy);
        ctx.stroke();
      }

      ctx.fillStyle = shade(suit, -30);
      ctx.fillRect(-W, -T - 6, W * 2, 9);
      break;
    }

    case "imperial": {
      ctx.strokeStyle = "#D4A93A";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-W, -T + 2);
      ctx.lineTo(W, -22);
      ctx.stroke();

      ctx.fillStyle = "#F5D77A";

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(B.sh * 0.45, -T + 14 + i * 7, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#D4A93A";
      ctx.fillRect(-W, -T - 6, W * 2, 8);
      break;
    }

    case "suk": {
      ctx.fillStyle = "#E7E2D6";
      ctx.fillRect(-4, -T - 6, 10, 10);

      ctx.strokeStyle = shade(suit, 30);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(B.sh * 0.4, -T + 4);
      ctx.lineTo(B.sh * 0.4, -14);
      ctx.stroke();
      break;
    }

    case "gown":
    case "bg-robe": {
      const trim = outfit === "gown" ? "#F5D77A" : shade(accent, -20);

      ctx.strokeStyle = trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-B.sh * 0.4, -T - 4);
      ctx.quadraticCurveTo(B.sh * 0.3, -T + 10, B.sh + 2, -T - 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(B.waist - 3, -T * 0.32);
      ctx.lineTo(-B.waist + 2, -T * 0.32);
      ctx.stroke();

      if (outfit === "bg-robe") {
        ctx.strokeStyle = shade(suit, 25);
        ctx.lineWidth = 1;

        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 6, -T + 12);
          ctx.lineTo(i * 6 + 3, -16);
          ctx.stroke();
        }
      }
      break;
    }

    case "super": {
      ctx.strokeStyle = shade(suit, 32);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-B.sh + 4, -T * 0.4);
      ctx.quadraticCurveTo(0, -T * 0.34, B.waist - 2, -T * 0.4);
      ctx.stroke();

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.moveTo(-B.sh + 2, -T + 4);
      ctx.lineTo(-B.waist + 1, -18);
      ctx.stroke();

      if (fem) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(B.sh - 2, -T * 0.7, 6, -0.6, 0.9);
        ctx.stroke();
      }

      // Superman's red collar; Green Lantern has a green collar instead.
      ctx.fillStyle = isGreenLantern ? "#087A42" : "#C21D25";
      ctx.fillRect(-W, -T - 6, W * 2, 4);
      break;
    }

    case "sandtrout": {
      ctx.strokeStyle = shade(suit, -30);
      ctx.lineWidth = 1.5;

      for (let yy = -T; yy < 0; yy += 8) {
        for (let xx = -W + ((yy / 8) % 2 ? 4 : 0); xx < W; xx += 9) {
          ctx.beginPath();
          ctx.arc(xx, yy, 5, 0, Math.PI);
          ctx.stroke();
        }
      }

      ctx.fillStyle = `rgba(44,212,245,${0.25 + Math.sin(t * 3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(B.sh * 0.3, -T * 0.6, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/** Green Lantern's chest symbol. */
function drawGreenLanternEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "#F8FAFC";
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#087A42";
  ctx.fillRect(-3, -6, 6, 12);
  ctx.fillRect(-7, -3, 14, 6);
  ctx.fillRect(-5, -8, 10, 2);
  ctx.fillRect(-5, 6, 10, 2);

  ctx.restore();
}

function drawEmblem(
  ctx: CanvasRenderingContext2D,
  kind: NonNullable<Look["emblem"]>,
  cx: number,
  cy: number,
  mirror: number,
  accent: string,
) {
  ctx.save();
  ctx.translate(cx, cy);

  if (kind === "S") {
    ctx.fillStyle = "#F8C630";
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(10, -7);
    ctx.lineTo(13, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-13, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#C21D25";
    ctx.beginPath();
    ctx.moveTo(-8, -5.2);
    ctx.lineTo(8, -5.2);
    ctx.lineTo(10.5, -1.8);
    ctx.lineTo(0, 8.6);
    ctx.lineTo(-10.5, -1.8);
    ctx.closePath();
    ctx.fill();

    ctx.scale(mirror, 1);
    ctx.fillStyle = "#F8C630";
    ctx.font = "900 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", 0, 0.5);
  } else if (kind === "hawk") {
    ctx.fillStyle = "#B91C1C";
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.lineTo(0, 3);
    ctx.lineTo(9, -3);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "griffin") {
    ctx.fillStyle = "#7F1D1D";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(7, 6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#D4A93A";
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shade(accent, -60);
    ctx.fillRect(-1.5, -3, 3, 6);
  }

  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  def: FighterDef,
  L: Look,
  hx: number,
  hy: number,
  r: number,
  cloak: string,
  suit: string,
  t: number,
  frozen: boolean,
  sil: boolean,
  col: (c: string) => string,
) {
  const p = def.palette;
  const hair = p.hair;

  // hair behind the head
  if (!sil && !def.hood && !L.helmet && !L.veil) {
    ctx.fillStyle = hair;

if (def.id === "supergirl") {
  // Supergirl's long, flowing blonde back hair
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.55, hy - r * 0.75);
  ctx.quadraticCurveTo(hx - r * 1.35, hy - r * 0.2, hx - r * 1.15, hy + r * 1.8);
  ctx.quadraticCurveTo(hx - r * 1.05, hy + r * 2.5, hx - r * 0.55, hy + r * 2.7);
  ctx.quadraticCurveTo(hx - r * 0.7, hy + r * 1.4, hx - r * 0.15, hy + r * 0.7);
  ctx.quadraticCurveTo(hx + r * 0.65, hy + r * 1.8, hx + r * 1.05, hy + r * 2.35);
  ctx.quadraticCurveTo(hx + r * 1.25, hy + r * 1.2, hx + r * 0.65, hy - r * 0.55);
  ctx.closePath();
  ctx.fill();

  // Flowing hair strands
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.8, hy + r * 0.1);
  ctx.quadraticCurveTo(hx - r * 1.05, hy + r * 1.4, hx - r * 0.7, hy + r * 2.3);
  ctx.moveTo(hx + r * 0.65, hy + r * 0.15);
  ctx.quadraticCurveTo(hx + r * 1.1, hy + r * 1.3, hx + r * 0.9, hy + r * 2.1);
  ctx.strokeStyle = "rgba(255,245,190,0.55)";
  ctx.lineWidth = r * 0.09;
  ctx.stroke();

} else if (L.hair === "long" || L.hair === "platinum") {      ctx.beginPath();
      ctx.moveTo(hx - r * 0.2, hy - r);
      ctx.quadraticCurveTo(hx - r * 1.35, hy - r * 0.2, hx - r * 1.05, hy + r * (L.hair === "platinum" ? 2.6 : 1.9));
      ctx.lineTo(hx - r * 0.2, hy + r * (L.hair === "platinum" ? 2.4 : 1.6));
      ctx.lineTo(hx + r * 0.1, hy);
      ctx.closePath();
      ctx.fill();
    } else if (L.hair === "bob") {
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.1, hy - r * 1.05);
      ctx.quadraticCurveTo(hx - r * 1.4, hy - r * 0.3, hx - r * 1.05, hy + r * 1.05);
      ctx.quadraticCurveTo(hx - r * 0.8, hy + r * 1.3, hx - r * 0.35, hy + r * 1.0);
      ctx.lineTo(hx + r * 0.1, hy);
      ctx.closePath();
      ctx.fill();
    } else if (L.hair === "braids") {
      ctx.fillRect(hx - r * 1.0, hy, r * 0.4, r * 2);
    }
  }

  // skull and face
  const sg = sil ? null : ctx.createRadialGradient(
    hx + r * 0.4,
    hy - r * 0.3,
    r * 0.2,
    hx,
    hy,
    r * 1.2,
  );

  if (sg) {
    sg.addColorStop(0, shade(p.skin, 14));
    sg.addColorStop(1, shade(p.skin, -22));
  }

  ctx.fillStyle = sg ?? col(p.skin);
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 0.95, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // jaw
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.42, hy + r * 0.55, r * 0.5, r * 0.42, 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (sil) return;

  // ear
  ctx.fillStyle = shade(p.skin, -24);
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.12, hy + r * 0.05, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose
  ctx.fillStyle = shade(p.skin, -8);
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.85, hy - r * 0.15);
  ctx.lineTo(hx + r * 1.08, hy + r * 0.25);
  ctx.lineTo(hx + r * 0.82, hy + r * 0.3);
  ctx.closePath();
  ctx.fill();

  // eye
  const ex = hx + r * 0.5;
  const ey = hy - r * 0.12;
  const fremen = p.eyes === FREMEN;

  ctx.fillStyle = fremen ? "#BFF3FF" : "#F4EEE6";
  ctx.beginPath();
  ctx.ellipse(ex, ey, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = frozen ? "#ffffff" : p.eyes;

  if (fremen) {
    ctx.shadowColor = FREMEN;
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  ctx.arc(ex + r * 0.08, ey, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (L.female) {
    ctx.strokeStyle = "#1A1210";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.2, ey - r * 0.12);
    ctx.quadraticCurveTo(ex + r * 0.05, ey - r * 0.22, ex + r * 0.3, ey - r * 0.1);
    ctx.stroke();
  }

  const browless = L.hair === "none" && !L.female;

  if (!browless) {
    ctx.strokeStyle = shade(hair, -25);
    ctx.lineWidth = L.female ? 1.6 : 2.4;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.25, ey - r * 0.3);
    ctx.lineTo(ex + r * 0.28, ey - r * 0.34);
    ctx.stroke();
  }

  // mouth
  ctx.strokeStyle = L.female ? "#B5485A" : shade(p.skin, -55);
  ctx.lineWidth = L.female ? 2.2 : 1.6;
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.55, hy + r * 0.55);
  ctx.lineTo(hx + r * 0.85, hy + r * 0.52);
  ctx.stroke();

  if (L.mentatLips) {
    ctx.strokeStyle = "#5B1414";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.75, hy + r * 0.58);
    ctx.lineTo(hx + r * 0.72, hy + r * 0.85);
    ctx.stroke();
  }

  if (L.scar) {
    ctx.strokeStyle = "#B4636B";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.2, hy - r * 0.1);
    ctx.lineTo(hx + r * 0.55, hy + r * 0.75);
    ctx.stroke();
  }

  if (L.diamond) {
    ctx.fillStyle = "#1F2937";
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.55, hy - r * 0.75);
    ctx.lineTo(hx + r * 0.68, hy - r * 0.58);
    ctx.lineTo(hx + r * 0.55, hy - r * 0.42);
    ctx.lineTo(hx + r * 0.42, hy - r * 0.58);
    ctx.closePath();
    ctx.fill();
  }

  // headwear
  if (L.helmet) {
    ctx.fillStyle = shade(suit, 10);
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.05, hy - r * 0.15, r * 1.12, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(hx + r * 0.25, hy - r * 0.25, r * 0.85, r * 0.22);

    ctx.fillStyle = shade(suit, 40);
    ctx.fillRect(hx - r * 0.9, hy - r * 1.25, r * 1.4, r * 0.18);
    return;
  }

  if (L.veil) {
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 2, r * 1.3, Math.PI * 0.55, Math.PI * 2.3);
    ctx.lineTo(hx - r * 1.6, hy + r * 2.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = shade(cloak, 30);
    ctx.lineWidth = 1;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(hx - 2, hy - 2, r * (1.05 + i * 0.08), Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    return;
  }

  if (def.hood) {
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 2, r * 1.25, Math.PI * 0.62, Math.PI * 2.25);
    ctx.lineTo(hx - r * 1.2, hy + r * 1.1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = shade(cloak, -35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 2, r * 1.05, Math.PI * 1.25, Math.PI * 2.1);
    ctx.stroke();

    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.ellipse(hx + r * 0.38, hy + r * 0.12, r * 0.62, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.eyes;

    if (p.eyes === FREMEN) {
      ctx.shadowColor = FREMEN;
      ctx.shadowBlur = 10;
    }

    ctx.beginPath();
    ctx.arc(ex + r * 0.08, ey, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (L.outfit === "stillsuit" && p.eyes === FREMEN) {
      ctx.fillStyle = shade(suit, 20);
      ctx.fillRect(hx + r * 0.55, hy + r * 0.3, r * 0.5, r * 0.22);

      ctx.strokeStyle = shade(suit, 20);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.6, hy + r * 0.42);
      ctx.quadraticCurveTo(hx + r * 0.1, hy + r * 0.9, hx - r * 0.3, hy + r * 0.7);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = hair;

    switch (L.hair) {
      case "short": {
  if (def.id === "superman") {
    // Superman: thick hair with a distinctive forehead curl.
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.95, hy - r * 0.05);
    ctx.quadraticCurveTo(
      hx - r * 1.15, hy - r * 1.15,
      hx - r * 0.25, hy - r * 1.12,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.25, hy - r * 1.5,
      hx + r * 0.85, hy - r * 0.85,
    );
    ctx.quadraticCurveTo(
      hx + r * 1.1, hy - r * 0.35,
      hx + r * 0.75, hy - r * 0.12,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.55, hy - r * 0.75,
      hx + r * 0.25, hy - r * 0.55,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.05, hy - r * 0.15,
      hx - r * 0.05, hy - r * 0.48,
    );
    ctx.quadraticCurveTo(
      hx - r * 0.35, hy - r * 0.05,
      hx - r * 0.95, hy - r * 0.05,
    );
    ctx.closePath();
    ctx.fill();

    // Forehead curl.
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.15, hy - r * 0.65);
    ctx.quadraticCurveTo(
      hx + r * 0.85, hy - r * 0.7,
      hx + r * 0.48, hy + r * 0.05,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.42, hy - r * 0.35,
      hx + r * 0.15, hy - r * 0.65,
    );
    ctx.fill();

  } else if (def.id === "greenlantern") {
    // Hal Jordan: short, side-swept hair with a raised front wave.
    ctx.beginPath();
    ctx.moveTo(hx - r * 1.0, hy + r * 0.05);
    ctx.quadraticCurveTo(
      hx - r * 1.15, hy - r * 0.8,
      hx - r * 0.65, hy - r * 1.0,
    );
    ctx.quadraticCurveTo(
      hx - r * 0.15, hy - r * 1.25,
      hx + r * 0.2, hy - r * 0.95,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.7, hy - r * 1.45,
      hx + r * 1.0, hy - r * 0.65,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.75, hy - r * 0.75,
      hx + r * 0.45, hy - r * 0.55,
    );
    ctx.quadraticCurveTo(
      hx + r * 0.05, hy - r * 0.3,
      hx - r * 0.2, hy - r * 0.55,
    );
    ctx.quadraticCurveTo(
      hx - r * 0.55, hy - r * 0.2,
      hx - r * 1.0, hy + r * 0.05,
    );
    ctx.closePath();
    ctx.fill();

    // Side-swept hair detail.
    ctx.strokeStyle = shade(hair, 35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.65, hy - r * 0.65);
    ctx.quadraticCurveTo(
      hx - r * 0.05, hy - r * 1.0,
      hx + r * 0.65, hy - r * 0.85,
    );
    ctx.stroke();

  } else {
    // Original short hairstyle for everyone else.
    ctx.beginPath();
    ctx.arc(hx - 2, hy - r * 0.2, r * 1.02, Math.PI * 0.95, Math.PI * 2.0);
    ctx.fill();
    ctx.fillRect(hx - r * 1.05, hy - r * 0.35, r * 0.55, r * 0.95);
  }

  break;
}
      case "none": {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.8, Math.PI * 1.15, Math.PI * 1.5);
        ctx.stroke();
        break;
      }

      case "slick": {
        ctx.beginPath();
        ctx.arc(hx - 1, hy - r * 0.2, r * 0.98, Math.PI * 0.95, Math.PI * 1.92);
        ctx.lineTo(hx + r * 0.3, hy - r * 0.55);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(hx - 1, hy - r * 0.2, r * 0.75, Math.PI * 1.2, Math.PI * 1.6);
        ctx.stroke();
        break;
      }

      case "curly":
      case "wavy": {
        ctx.beginPath();
        ctx.arc(hx - 2, hy - r * 0.15, r * 1.02, Math.PI * 0.92, Math.PI * 2.02);
        ctx.fill();

        const n = L.hair === "curly" ? 8 : 6;

        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.95 + (i / (n - 1)) * 1.0);

          ctx.beginPath();
          ctx.arc(
            hx - 2 + Math.cos(a) * r * 0.95,
            hy - r * 0.15 + Math.sin(a) * r * 0.95,
            r * (L.hair === "curly" ? 0.36 : 0.3),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        ctx.fillRect(hx - r * 1.05, hy - r * 0.2, r * 0.6, r * (L.hair === "curly" ? 1.4 : 1.0));
        break;
      }

      case "bob": {
        ctx.beginPath();
        ctx.arc(hx - 1, hy - r * 0.18, r * 1.05, Math.PI * 0.9, Math.PI * 2.0);
        ctx.quadraticCurveTo(hx + r * 0.6, hy - r * 0.75, hx + r * 0.1, hy - r * 0.35);
        ctx.fill();

        ctx.strokeStyle = shade(hair, 30);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - r * 0.2, hy - r * 1.05);
        ctx.quadraticCurveTo(hx - r * 1.1, hy - r * 0.3, hx - r * 0.95, hy + r * 0.9);
        ctx.stroke();

        ctx.strokeStyle = shade(hair, -30);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx + r * 0.1, hy - r * 1.0);
        ctx.quadraticCurveTo(hx - r * 0.6, hy - r * 0.2, hx - r * 0.7, hy + r * 0.9);
        ctx.stroke();
        break;
      }

      case "bun": {
        ctx.beginPath();
        ctx.arc(hx - 1, hy - r * 0.18, r * 1.0, Math.PI * 0.95, Math.PI * 2.0);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(hx - r * 1.0, hy - r * 0.55, r * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = shade(hair, -30);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(hx - r * 1.0, hy - r * 0.55, r * 0.3, 0, Math.PI * 1.5);
        ctx.stroke();
        break;
      }

      default: {
        ctx.beginPath();
        ctx.arc(hx - 2, hy - r * 0.2, r * 1.02, Math.PI * 0.95, Math.PI * 2.0);
        ctx.fill();

        ctx.fillRect(hx - r * 1.05, hy - r * 0.35, r * 0.55, r * 0.95);

        if (L.hair === "platinum") {
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(hx - 2, hy - r * 0.2, r * 0.8, Math.PI * 1.1, Math.PI * 1.7);
          ctx.stroke();
        }
      }
    }
  }

  if (def.beard) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.05, hy + r * 0.2);
    ctx.quadraticCurveTo(hx + r * 0.1, hy + r * 1.15, hx + r * 0.65, hy + r * 1.0);
    ctx.quadraticCurveTo(hx + r * 0.95, hy + r * 0.8, hx + r * 0.9, hy + r * 0.62);
    ctx.lineTo(hx + r * 0.5, hy + r * 0.66);
    ctx.lineTo(hx + r * 0.25, hy + r * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  if (L.mustache || def.beard) {
    ctx.strokeStyle = hair;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.5, hy + r * 0.47);
    ctx.quadraticCurveTo(hx + r * 0.72, hy + r * 0.36, hx + r * 0.92, hy + r * 0.46);
    ctx.stroke();
  }

  void t;
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  def: FighterDef,
  x: number,
  y: number,
  a: number,
  glow: number,
  bladeColor?: string,
) {
  const dir = a + Math.PI / 2 - 0.25;
  const len = { knife: 30, sword: 74, staff: 0, needle: 16, fists: 0 }[def.weapon];

  ctx.save();

  if (glow > 0.05) {
    ctx.shadowColor = bladeColor || def.palette.accent;
    ctx.shadowBlur = 22 * glow;
  }

  if (def.weapon === "staff") {
    const dx = Math.sin(dir) * 80;
    const dy = Math.cos(dir) * 80;

    ctx.strokeStyle = "#6B5440";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - dx * 0.8, y - dy * 0.8);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();

    ctx.fillStyle = bladeColor || "#E5E7EB";
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (len > 0) {
    const ex = x + Math.sin(dir) * len;
    const ey = y + Math.cos(dir) * len;

    ctx.strokeStyle =
      bladeColor ||
      (def.weapon === "knife"
        ? "#F5EBE1"
        : def.weapon === "needle"
          ? def.palette.accent
          : "#D6D3D1");

    ctx.lineWidth = def.weapon === "sword" ? 5 : def.weapon === "needle" ? 2.5 : 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    if (def.weapon === "sword") {
      ctx.strokeStyle = "#8B6B3E";
      ctx.lineWidth = 4;

      const gx = Math.cos(dir) * 9;
      const gy = -Math.sin(dir) * 9;

      ctx.beginPath();
      ctx.moveTo(x + Math.sin(dir) * 6 - gx, y + Math.cos(dir) * 6 - gy);
      ctx.lineTo(x + Math.sin(dir) * 6 + gx, y + Math.cos(dir) * 6 + gy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

type TubePt = {
  x: number;
  y: number;
  r: number;
};

/** Thick segmented worm body along a centreline. */
function wormTube(ctx: CanvasRenderingContext2D, pts: TubePt[], ridgeEvery = 3) {
  const L: { x: number; y: number }[] = [];
  const R: { x: number; y: number }[] = [];

  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    L.push({ x: pts[i].x + nx * pts[i].r, y: pts[i].y + ny * pts[i].r });
    R.push({ x: pts[i].x - nx * pts[i].r, y: pts[i].y - ny * pts[i].r });
  }

  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of pts) {
    minY = Math.min(minY, p.y - p.r);
    maxY = Math.max(maxY, p.y + p.r);
  }

  const g = ctx.createLinearGradient(0, minY, 0, maxY);
  g.addColorStop(0, "#D9955A");
  g.addColorStop(0.45, "#9C5A2E");
  g.addColorStop(1, "#3E1D0C");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L[0].x, L[0].y);

  for (const p of L) ctx.lineTo(p.x, p.y);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i].x, R[i].y);

  ctx.closePath();
  ctx.fill();

  // ring ridges
  for (let i = ridgeEvery; i < pts.length - 1; i += ridgeEvery) {
    ctx.strokeStyle = "rgba(38,14,4,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(L[i].x, L[i].y);
    ctx.quadraticCurveTo(
      pts[i].x + (pts[i].x - pts[i - 1].x) * 2,
      pts[i].y + (pts[i].y - pts[i - 1].y) * 2,
      R[i].x,
      R[i].y,
    );
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,214,160,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L[i - 1].x, L[i - 1].y);
    ctx.quadraticCurveTo(
      pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 2,
      pts[i - 1].y + (pts[i].y - pts[i - 1].y) * 2,
      R[i - 1].x,
      R[i - 1].y,
    );
    ctx.stroke();
  }

  // rim light
  ctx.strokeStyle = "rgba(255,200,140,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L[0].x, L[0].y);

  for (const p of L) ctx.lineTo(p.x, p.y);

  ctx.stroke();
}

/** Three-petal maw with rings of crystal teeth and a glowing throat. */
function wormMaw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  squash: number,
  rot: number,
  open: number,
  frame: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, squash);

  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3 - Math.PI / 2 + Math.sin(frame * 0.08) * 0.05;
    const tip = r * (1.05 + 0.55 * open);

    ctx.fillStyle = "#B4683A";
    ctx.strokeStyle = "#3A1608";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.75) * r * 0.9, Math.sin(a - 0.75) * r * 0.9);
    ctx.quadraticCurveTo(
      Math.cos(a - 0.3) * tip * 1.1,
      Math.sin(a - 0.3) * tip * 1.1,
      Math.cos(a) * tip,
      Math.sin(a) * tip,
    );
    ctx.quadraticCurveTo(
      Math.cos(a + 0.3) * tip * 1.1,
      Math.sin(a + 0.3) * tip * 1.1,
      Math.cos(a + 0.75) * r * 0.9,
      Math.sin(a + 0.75) * r * 0.9,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(120,30,18,0.7)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.45) * r * 0.95, Math.sin(a - 0.45) * r * 0.95);
    ctx.lineTo(Math.cos(a) * tip * 0.82, Math.sin(a) * tip * 0.82);
    ctx.lineTo(Math.cos(a + 0.45) * r * 0.95, Math.sin(a + 0.45) * r * 0.95);
    ctx.closePath();
    ctx.fill();
  }

  // rim and throat
  ctx.fillStyle = "#2A0C05";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  const pulse = 0.75 + Math.sin(frame * 0.25) * 0.25;
  const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.85);
  tg.addColorStop(0, `rgba(255,190,90,${0.95 * pulse})`);
  tg.addColorStop(0.35, "rgba(214,84,28,0.85)");
  tg.addColorStop(1, "rgba(30,6,2,1)");

  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // teeth
  for (let ring = 0; ring < 3; ring++) {
    const rr = r * (0.95 - ring * 0.22);
    const n = 18 - ring * 4;

    ctx.fillStyle = ring === 0 ? "#F4EAD2" : ring === 1 ? "#E6D6B4" : "#CDB894";

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3 + frame * 0.01 * (ring % 2 ? -1 : 1);
      const len = r * (0.2 - ring * 0.03);

      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.09) * rr, Math.sin(a - 0.09) * rr);
      ctx.lineTo(Math.cos(a) * (rr - len), Math.sin(a) * (rr - len));
      ctx.lineTo(Math.cos(a + 0.09) * rr, Math.sin(a + 0.09) * rr);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Sandworm hazard. */
export function drawSandworm(
  ctx: CanvasRenderingContext2D,
  x: number,
  half: number,
  phase: "warn" | "strike" | "ride",
  progress: number,
  frame: number,
  dir = 1,
) {
  ctx.save();

  if (phase === "warn") {
    const vg = ctx.createRadialGradient(x, GROUND, 0, x, GROUND, half);
    vg.addColorStop(0, `rgba(20,10,4,${0.55 + progress * 0.35})`);
    vg.addColorStop(1, "rgba(20,10,4,0)");

    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.ellipse(x, GROUND, half, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      const k = ((frame * 0.025 + i / 3) % 1);

      ctx.strokeStyle = `rgba(232,137,44,${(1 - k) * (0.4 + progress * 0.5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, GROUND, half * (0.25 + k * 0.85), 30 * (0.25 + k * 0.85), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(240,200,144,${0.25 + progress * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let t = 0; t < 26; t++) {
      const a = t * 0.5 + frame * 0.12;
      const rr = (t / 26) * half * 0.8;
      const px = x + Math.cos(a) * rr;
      const py = GROUND + Math.sin(a) * rr * 0.2;

      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.stroke();

    ctx.strokeStyle = `rgba(60,24,8,${0.4 + progress * 0.5})`;
    ctx.lineWidth = 2;

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;

      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * half * 0.2, GROUND + Math.sin(a) * 5);
      ctx.lineTo(
        x + Math.cos(a) * half * (0.5 + progress * 0.5),
        GROUND + Math.sin(a) * 26 * progress,
      );
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (phase === "strike") {
    const rise = Math.sin(Math.min(1, progress * 1.25) * Math.PI) * 460;

    const hg = ctx.createRadialGradient(x, GROUND - rise * 0.5, 10, x, GROUND - rise * 0.5, 260);
    hg.addColorStop(0, "rgba(255,160,80,0.18)");
    hg.addColorStop(1, "rgba(255,160,80,0)");

    ctx.fillStyle = hg;
    ctx.fillRect(x - 280, GROUND - rise - 120, 560, rise + 200);

    const pts: TubePt[] = [];
    const N = 18;

    for (let i = 0; i <= N; i++) {
      const k = i / N;

      pts.push({
        x: x + Math.sin(frame * 0.12 + k * 3) * 16 * k + k * k * 18,
        y: GROUND + 20 - rise * k,
        r: 82 - k * 18,
      });
    }

    wormTube(ctx, pts, 2);

    ctx.strokeStyle = "rgba(226,180,120,0.55)";
    ctx.lineWidth = 2;

    for (let i = 0; i < 7; i++) {
      const k = 0.35 + i * 0.08;
      const p = pts[Math.min(N, Math.round(k * N))];
      const side = i % 2 ? 1 : -1;
      const sx = p.x + side * p.r * 0.95;

      ctx.beginPath();
      ctx.moveTo(sx, p.y);
      ctx.quadraticCurveTo(
        sx + side * 14,
        p.y + 60,
        sx + side * 8,
        Math.min(GROUND, p.y + 140 + ((frame * 6 + i * 30) % 60)),
      );
      ctx.stroke();
    }

    const head = pts[N];
    wormMaw(ctx, head.x, head.y, 58, 0.62, Math.sin(frame * 0.1) * 0.08, Math.min(1, progress * 2), frame);

    ctx.fillStyle = "#B57447";
    ctx.beginPath();
    ctx.ellipse(x, GROUND + 6, 140, 26, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // ride
  const pts: TubePt[] = [];
  const N = 24;

  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const bob = Math.sin(frame * 0.18 + k * 6) * 6;
    const lift = 150 * Math.exp(-(((k - 0.62) / 0.32) ** 2));
    const headRear = k > 0.8 ? (k - 0.8) * 5 * 190 : 0;

    pts.push({
      x: x + dir * (-300 + k * 400),
      y: GROUND + 30 - lift - headRear + bob,
      r: 34 + Math.sin(Math.PI * k) * 26,
    });
  }

  wormTube(ctx, pts, 2);

  const head = pts[N];
  wormMaw(ctx, head.x + dir * 6, head.y, 46, 0.9, dir * 0.3, 0.8 + Math.sin(frame * 0.2) * 0.2, frame);

  ctx.fillStyle = "rgba(200,140,90,0.75)";

  for (let i = 0; i < 3; i++) {
    const wx = x + dir * (60 - i * 160);

    ctx.beginPath();
    ctx.ellipse(wx, GROUND + 6, 70 - i * 10, 20 - i * 3, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.35 + Math.sin(frame * 0.3) * 0.15;
  ctx.strokeStyle = "#FFC15E";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x - dir * 34, GROUND - 172, 54, 14, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/** Static backdrop rendered once into an offscreen canvas. */
export function renderBackdrop(w = VW, h = VH): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;

  const ctx = c.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#5A1F10");
  sky.addColorStop(0.35, "#B4502A");
  sky.addColorStop(0.62, "#E08A47");
  sky.addColorStop(1, "#F2B572");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.4);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color + "88");
    g.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);

    ctx.fillStyle = "#FFF1D0";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  };

  sun(w * 0.74, h * 0.2, 90, "#FFA834");
  sun(w * 0.86, h * 0.31, 48, "#E8452C");

  const dune = (
    base: number,
    amp: number,
    freq: number,
    phase: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 8) {
      const y =
        base -
        Math.sin(x * freq + phase) * amp -
        Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35;

      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };

  dune(h * 0.62, 26, 0.004, 0.5, "#C8743F");

  // ruined pillar
  ctx.save();
  ctx.translate(w * 0.2, h * 0.7);
  ctx.rotate(-0.22);

  ctx.fillStyle = "#6A3A22";
  ctx.fillRect(-46, -300, 92, 320);

  ctx.strokeStyle = "#4E2915";
  ctx.lineWidth = 3;

  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-46, -300 + i * 54);
    ctx.lineTo(46, -294 + i * 54);
    ctx.stroke();
  }

  ctx.restore();

  dune(h * 0.7, 30, 0.006, 2.1, "#B4602F");
  dune(h * 0.78, 18, 0.003, 4.2, "#9A4E25");

  // arena floor
  const floor = ctx.createLinearGradient(0, GROUND - 30, 0, h);
  floor.addColorStop(0, "#8A4520");
  floor.addColorStop(1, "#4A220F");

  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND - 6, w, h - GROUND + 6);

  ctx.fillStyle = "rgba(255,210,150,0.12)";
  ctx.fillRect(0, GROUND - 6, w, 3);

  // grain
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,230,200" : "40,15,5"},${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  return c;
}