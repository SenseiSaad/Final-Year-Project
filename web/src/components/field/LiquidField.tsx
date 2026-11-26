"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { cn } from "@/lib/cn";

/*
  A background image drawn live: slowly flowing contour lines, like a survey of
  the records room. One hairline per level, every fifth drawn heavier. The lines
  take the theme's ink colour, bend gently away from the pointer, and fade out
  behind text. It is decoration only: hidden from assistive technology, paused
  off screen, held still for reduced motion, and simply absent without WebGL 2.
*/

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uInk;
uniform float uAlpha;
uniform float uScale;
uniform float uLines;
uniform vec2 uCalm;
out vec4 outColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;
  vec2 d = uv - uPointer;
  uv += normalize(d + 1e-4) * 0.045 * exp(-dot(d, d) * 16.0);

  vec2 p = uv * uScale;
  float t = uTime * 0.07;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  float f = fbm(p + 2.1 * q + vec2(t * 0.7, -t * 0.5));

  float v = f * uLines;
  float level = floor(v + 0.5);
  float dist = abs(v - level);
  float w = fwidth(v);
  float line = 1.0 - smoothstep(w * 0.45, w * 1.0, dist);
  float index = mod(level, 5.0) == 0.0 ? 1.0 : 0.6;

  float x = gl_FragCoord.x / uRes.x;
  float y = gl_FragCoord.y / uRes.y;
  float calm = mix(uCalm.y, 1.0, smoothstep(uCalm.x - 0.22, uCalm.x + 0.2, x));
  float edge = smoothstep(0.0, 0.12, y) * smoothstep(0.0, 0.1, 1.0 - y);

  float a = line * index * uAlpha * calm * edge;
  outColor = vec4(uInk * a, a);
}`;

function parseColor(value: string): [number, number, number] {
  const hex = value.trim().replace("#", "");
  if (hex.length === 6) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return [0.5, 0.5, 0.5];
}

type Props = {
  className?: string;
  /** Size of the landforms; larger is calmer */
  scale?: number;
  /** Number of contour levels */
  lines?: number;
  /** Where text sits: [x position 0..1 where the field reaches full strength, strength to the left of it] */
  calm?: [number, number];
  /** Overall strength multiplier */
  strength?: number;
};

export function LiquidField({ className, scale = 1.7, lines = 14, calm = [0, 1], strength = 1 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [calmX, calmY] = calm;
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    // A lost context would paint as a solid block: hide the canvas instead
    const onLost = (event: Event) => {
      event.preventDefault();
      el.style.visibility = "hidden";
    };
    el.addEventListener("webglcontextlost", onLost);
    el.style.visibility = "";

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes"), uTime = u("uTime"), uPointer = u("uPointer"), uInk = u("uInk");
    const uAlpha = u("uAlpha"), uScale = u("uScale"), uLines = u("uLines"), uCalm = u("uCalm");

    let ink = parseColor("#808080");
    let alpha = 0.16;
    const readTheme = () => {
      const style = getComputedStyle(document.documentElement);
      ink = parseColor(style.getPropertyValue("--ink"));
      alpha = parseFloat(style.getPropertyValue("--field-alpha")) * strength;
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let width = 1;
    let height = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(el.clientWidth * dpr));
      height = Math.max(1, Math.round(el.clientHeight * dpr));
      el.width = width;
      el.height = height;
      gl.viewport(0, 0, width, height);
    };
    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) draw(14);
    });
    resizeObserver.observe(el);

    const pointer = { x: -9, y: -9, tx: -9, ty: -9 };
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) / rect.height;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
    };

    const draw = (time: number) => {
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform3f(uInk, ink[0], ink[1], ink[2]);
      gl.uniform1f(uAlpha, alpha);
      gl.uniform1f(uScale, scale);
      gl.uniform1f(uLines, lines);
      gl.uniform2f(uCalm, calmX, calmY);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduced) {
      draw(14);
      return () => {
        el.removeEventListener("webglcontextlost", onLost);
        observer.disconnect();
        resizeObserver.disconnect();
      };
    }

    let visible = true;
    let raf = 0;
    let last = 0;
    let clock = 12;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 33) return;
      clock += Math.min((now - last) / 1000, 0.1);
      last = now;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      draw(clock);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      observer.disconnect();
      resizeObserver.disconnect();
      el.removeEventListener("webglcontextlost", onLost);
    };
  }, [reduced, scale, lines, calmX, calmY, strength]);

  return <canvas ref={canvas} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", className)} />;
}
