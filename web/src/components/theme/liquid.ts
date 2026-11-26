/*
  The liquid edge used when the theme changes. A closed blob grows from the button
  until it covers the screen. The wobble swells mid-way and settles to a true circle,
  so the last frame fully covers the viewport. Every frame has the same path
  structure, which lets the browser interpolate between them.
*/

const SIDES = 12;

function blobPath(cx: number, cy: number, radius: number, wobble: number, phase: number) {
  const points: [number, number][] = [];
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2;
    const r = radius * (1 + wobble * (0.58 * Math.sin(3 * a + phase) + 0.42 * Math.sin(5 * a - phase * 1.4)));
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Closed Catmull-Rom spline converted to cubic Béziers
  const at = (i: number) => points[(i + SIDES) % SIDES];
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < SIDES; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function liquidKeyframes(x: number, y: number, farthestCorner: number, steps = 32): Keyframe[] {
  const supportsPath = typeof CSS !== "undefined" && CSS.supports("clip-path", 'path("M0 0L1 1Z")');
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const radius = easeInOut(t) * farthestCorner * 1.14;
    if (supportsPath) {
      const wobble = 0.17 * Math.sin(Math.PI * t) ** 1.2;
      frames.push({ offset: t, clipPath: `path("${blobPath(x, y, radius, wobble, t * 6.5)}")` });
    } else {
      frames.push({ offset: t, clipPath: `circle(${radius.toFixed(1)}px at ${x}px ${y}px)` });
    }
  }
  return frames;
}
