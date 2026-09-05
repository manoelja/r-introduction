import { useEffect, useRef } from 'react';
import './CyberBackground.css';

type Kind = 'virus' | 'bacteria';
type GermState = 'alive' | 'hit' | 'dying' | 'dead';

interface Germ {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  phase: number; // fase do ruído browniano + respiração
  depth: number; // 0..1 profundidade (parallax)
  tone: number; // variação de brilho por germe (0.85–1.15)
  hueBase: number; // deslocamento de matiz fixo por germe (graus)
  hueRange: number; // amplitude da oscilação lenta de cor (graus)
  hueSpeed: number; // velocidade da oscilação de cor (rad/s)
  state: GermState;
  stateTimer: number;
  deathScale: number; // 1 → 0 ao dissolver
  spawnScale: number; // 0 → 1 ao nascer (fade-in)
  respawnTimer: number;
  flash: number; // 1 → 0 ao ser atingido
  attackCd: number; // cooldown entre ataques às pílulas
  isBoss?: boolean; // chefão: vírus gigante coroado que só a vacina mata
}

interface Pill {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  target: Germ | null;
  palette: PillColors;
  state: 'idle' | 'celebrate' | 'dead';
  celebrateTimer: number;
  celebrateSpin: number;
  hitCooldown: number; // intervalo entre golpes no boss
  respawnTimer: number; // contagem para renascer após virar caveira
  spawnScale: number; // 0 → 1 fade-in ao renascer
}

interface Icon {
  kind: 'heart' | 'skull'; // coração = vacina venceu; caveira = vírus venceu
  x: number;
  y: number;
  size: number;
  life: number; // 1 → 0 (corações do fim não decaem)
  vy: number; // flutuação (coração sobe, caveira desce devagar)
  phase: number;
  persistent?: boolean; // coração do fim: flutua para sempre
}

// A vacina: entra na fase final (35s), solta ondas de cura em horários fixos e,
// na última onda (58.5s), mata todos os germes — os corações de vitória ficam na tela
interface Vaccine {
  x: number;
  y: number;
  waveT: number; // tempo desde a última onda (expansão visual, 0 = sem onda)
  nextWave: number; // instante (em segundos) da próxima onda de cura
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  chunk: boolean;
  rotation: number;
  rotSpeed: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

const DARK = {
  virus: '#f87171',
  bacteria: '#2dd4bf',
  particle: '#86efac',
  glowRgb: '134,239,172',
};

const LIGHT = {
  virus: '#dc2626',
  bacteria: '#0d9488',
  particle: '#16a34a',
  glowRgb: '22,163,74',
};

// Paleta dos heróis (cada cápsula tem uma cor própria)
interface PillColors {
  main: string;
  light: string;
  trailRgb: string;
}

const PILL_PALETTES: PillColors[] = [
  { main: '#0ea5e9', light: '#7dd3fc', trailRgb: '125,211,252' }, // azul
  { main: '#eab308', light: '#fde047', trailRgb: '253,224,71' }, // amarelo
  { main: '#ef4444', light: '#fca5a5', trailRgb: '252,165,165' }, // vermelho
  { main: '#a855f7', light: '#d8b4fe', trailRgb: '216,180,254' }, // roxo
  { main: '#f97316', light: '#fdba74', trailRgb: '253,186,116' }, // laranja
];

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const DT = 1 / TARGET_FPS;
const HIT_TIME = 0.8; // duração da fase "atingido" antes de morrer
const PILL_MAX_SPEED = 2.1;
const PILL_STEER = 0.12;
const LEAD_TIME = 0.35; // antecipação do alvo (segundos)
const TOTAL_DURATION = 60; // duração total da animação (s) — roteiro de 1 minuto
const BOSS_SPAWN_TIME = 25; // o chefão entra aos 25s, ANTES da vacina: massacra os remédios
const VACCINE_ARRIVE = 35; // a vacina entra aos 35s — após o massacre do chefão
const VACCINE_WAVE_INTERVAL = 8; // ondas de cura a cada 8s durante a fase da vacina
const VACCINE_WAVE_DUR = 2.2; // duração da expansão visual de cada onda (s)
const FINALE_TIME = 58.5; // última onda da vacina (golpe final): mata todos os germes → corações

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const toRgb = (color: string): [number, number, number] => {
  if (color.startsWith('rgb')) {
    const m = color.match(/\d+/g);
    if (m) return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Escurece/clareia uma cor por um fator (1 = igual, <1 escurece, >1 clareia)
const shade = (color: string, f: number): string => {
  const [r, g, b] = toRgb(color);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r * f)},${clamp(g * f)},${clamp(b * f)})`;
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h / 6) * 360, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360;
  s /= 100;
  l /= 100;
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
};

// Rotaciona o matiz de uma cor (graus) — mantém saturação/brilho
const hueRotate = (color: string, deg: number): string => {
  const [r, g, b] = toRgb(color);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb((h + deg + 360) % 360, s, l);
  return `rgb(${nr},${ng},${nb})`;
};

/**
 * Fundo animado "Bactérias × Remédio" (realista) — roteiro de 1 minuto:
 * - 0–25s: a batalha (vírus × pílulas — corações ❤️ e caveiras 💀 voam)
 * - 25–35s: o chefão dos vilões entra ANTES da vacina; todos os remédios avançam
 *   nele, mas ele os massacra um a um (caveiras 💀)
 * - 35–60s: a vacina entra e enfrenta o chefão — feixe de tensão pulsante entre
 *   os dois; as ondas de cura (43s e 51s) não o derrubam: ele RESISTE
 * - 58.5s: golpe final da vacina mata o chefão → corações de vitória flutuam para
 *   sempre e a vacina fica no centro com um coração pulsando acima dela
 * - Movimento browniano, morte em 2 fases, respawn com fade-in, profundidade
 * - 30 FPS, pausa com aba invisível, prefers-reduced-motion respeitado
 */
const CyberBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let isVisible = true;
    let lastFrameTime = 0;
    let time = 0;

    let width = 0;
    let height = 0;
    let germs: Germ[] = [];
    let pills: Pill[] = [];
    let particles: Particle[] = [];
    let shockwaves: Shockwave[] = [];
    let icons: Icon[] = [];
    let vaccine: Vaccine | null = null;
    let bossSpawned = false; // o chefão final já entrou em cena
    let finale = false; // a última onda já disparou — corações de vitória flutuam para sempre
    let maxParticles = 250; // limite de partículas (menor no mobile)
    let sizeScale = 1; // escala de tamanho das entidades conforme a tela
    // Mouse (cursor = remédio curador)
    const mouse = { x: -1000, y: -1000, active: false };

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const spawnGerm = (kind: Kind, atEdge = true): Germ => {
      const depth = rand(0.25, 1);
      const pad = 40;
      let x: number;
      let y: number;
      if (atEdge) {
        const side = Math.floor(rand(0, 4));
        if (side === 0) {
          x = rand(0, width);
          y = -pad;
        } else if (side === 1) {
          x = rand(0, width);
          y = height + pad;
        } else if (side === 2) {
          x = -pad;
          y = rand(0, height);
        } else {
          x = width + pad;
          y = rand(0, height);
        }
      } else {
        x = rand(0, width);
        y = rand(0, height);
      }
      const speed = rand(0.3, 0.8) * (0.5 + 0.7 * depth);
      const angle = rand(0, Math.PI * 2);
      return {
        kind,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (kind === 'virus' ? rand(12, 19) : rand(14, 21)) * (0.85 + 0.3 * depth) * sizeScale,
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.02, 0.02),
        phase: rand(0, Math.PI * 2),
        depth,
        tone: rand(0.85, 1.15),
        hueBase: kind === 'bacteria' ? rand(-25, 25) : rand(-20, 20),
        hueRange: rand(18, 34),
        hueSpeed: rand(0.15, 0.4),
        state: 'alive',
        stateTimer: 0,
        deathScale: 1,
        spawnScale: atEdge ? 0 : 1,
        respawnTimer: 0,
        flash: 0,
        attackCd: 0,
      };
    };

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
      germs = [];
      pills = [];
      particles = [];
      shockwaves = [];
      icons = [];
      vaccine = null;
      bossSpawned = false;
      finale = false;
      time = 0;
      // Escala de tamanho conforme a tela: telas pequenas → entidades menores
      sizeScale = Math.max(0.55, Math.min(1, Math.min(width, height) / 900));
      // Quantidade adaptada ao tamanho da tela (mobile tem bem menos entidades)
      const small = Math.min(width, height) < 520 || width < 768;
      maxParticles = small ? 100 : 250;
      const nVirus = small ? 3 : 6;
      const nBacteria = small ? 1 : 4;
      const nPills = small ? 2 : 5;
      for (let i = 0; i < nVirus; i++) germs.push(spawnGerm('virus', false));
      for (let i = 0; i < nBacteria; i++) germs.push(spawnGerm('bacteria', false));
      for (let i = 0; i < nPills; i++) {
        pills.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: rand(-0.4, 0.4),
          vy: rand(-0.4, 0.4),
          size: 11,
          rotation: rand(0, Math.PI * 2),
          target: null,
          palette: PILL_PALETTES[i % PILL_PALETTES.length],
          state: 'idle',
          celebrateTimer: 0,
          celebrateSpin: 0,
          hitCooldown: 0,
          respawnTimer: 0,
          spawnScale: 1,
        });
      }
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === 'visible';
    };

    const getColors = () =>
      document.documentElement.classList.contains('light-theme') ? LIGHT : DARK;

    // Mouse: rastreia o cursor e solta partículas de trilha (como o NeuralAnimation)
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      // Trilha sutil de partículas no cursor
      if (Math.random() > 0.5 && particles.length < maxParticles) {
        particles.push({
          x: mouse.x + rand(-2, 2),
          y: mouse.y + rand(-2, 2),
          vx: rand(-0.2, 0.2),
          vy: rand(-0.3, 0.05),
          life: 1,
          color: getColors().particle,
          size: rand(1, 2.2),
          chunk: false,
          rotation: 0,
          rotSpeed: 0,
        });
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const bounce = (o: { x: number; y: number; vx: number; vy: number; size: number }) => {
      const r = o.size;
      if (o.x < r) {
        o.x = r;
        o.vx = Math.abs(o.vx);
      } else if (o.x > width - r) {
        o.x = width - r;
        o.vx = -Math.abs(o.vx);
      }
      if (o.y < r) {
        o.y = r;
        o.vy = Math.abs(o.vy);
      } else if (o.y > height - r) {
        o.y = height - r;
        o.vy = -Math.abs(o.vy);
      }
    };

    const spawnParticle = (x: number, y: number, color: string, chunk: boolean) => {
      const angle = rand(0, Math.PI * 2);
      const speed = chunk ? rand(0.4, 1.2) : rand(0.6, 2.4);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: chunk ? rand(2.5, 4.5) : rand(1.4, 3.2),
        chunk,
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.15, 0.15),
      });
    };

    // Fase 1: remédio encosta → germe "atingido" (treme + flash)
    const hitGerm = (g: Germ, colors: typeof DARK) => {
      g.state = 'hit';
      g.stateTimer = HIT_TIME;
      g.flash = 1;
      for (let i = 0; i < 5; i++) spawnParticle(g.x, g.y, colors.particle, false);
    };

    // Fase 2: dissolve + explosão completa (onda de choque, brilho, pedaços) — e o vírus vira coração
    const explode = (g: Germ, colors: typeof DARK, persistent = false) => {
      shockwaves.push({ x: g.x, y: g.y, radius: g.size * 0.5, maxRadius: g.size * 3.4, life: 1 });
      for (let i = 0; i < 14; i++) spawnParticle(g.x, g.y, colors.particle, false);
      const bodyColor = hueRotate(
        g.kind === 'virus' ? colors.virus : colors.bacteria,
        g.hueBase + Math.sin(time * g.hueSpeed + g.phase) * g.hueRange,
      );
      for (let i = 0; i < 3; i++) spawnParticle(g.x, g.y, bodyColor, true);
      // A vacina ganhou: o vírus derrotado vira coração
      spawnIcon(g.x, g.y, 'heart', persistent);
    };

    // Chefão: vírus gigante coroado — só a vacina consegue matá-lo
    const spawnBoss = (): Germ => {
      const g = spawnGerm('virus', true);
      g.size = rand(27, 33) * sizeScale;
      g.isBoss = true;
      g.hueRange = 5; // quase sem oscilação — imponente
      g.hueSpeed = 0.12;
      g.vx *= 0.4;
      g.vy *= 0.4;
      return g;
    };

    // Explosão do chefão (grande) + corações cheios de vida
    const explodeBoss = (g: Germ, colors: typeof DARK, persistent = false) => {
      shockwaves.push({ x: g.x, y: g.y, radius: g.size * 0.6, maxRadius: g.size * 3.6, life: 1 });
      shockwaves.push({ x: g.x, y: g.y, radius: g.size * 0.3, maxRadius: g.size * 5.2, life: 1 });
      for (let i = 0; i < 32; i++) spawnParticle(g.x, g.y, colors.particle, false);
      const bodyColor = hueRotate(
        colors.virus,
        g.hueBase + Math.sin(time * g.hueSpeed + g.phase) * g.hueRange,
      );
      for (let i = 0; i < 6; i++) spawnParticle(g.x, g.y, bodyColor, true);
      spawnIcon(g.x, g.y, 'heart', persistent);
      spawnIcon(g.x + rand(-14, 14), g.y + rand(-8, 8), 'heart', persistent);
    };

    // Ícones flutuantes: coração (vacina venceu) ou caveira (vírus venceu)
    const spawnIcon = (x: number, y: number, kind: 'heart' | 'skull', persistent = false) => {
      let vy: number;
      if (persistent) vy = rand(-0.8, -0.35); // corações do fim: flutuam para sempre
      else vy = kind === 'heart' ? -0.12 : 0.07;
      icons.push({
        kind,
        x,
        y,
        size: kind === 'heart' ? 16 : 13,
        life: 1,
        vy,
        phase: rand(0, Math.PI * 2),
        persistent,
      });
      if (icons.length > 60) icons.splice(0, icons.length - 60);
    };

    // O vírus ganhou: a pílula vira caveira e renasce depois
    const killPill = (p: Pill, colors: typeof DARK) => {
      p.state = 'dead';
      const bossAlive = germs.some((g) => g.isBoss && g.state === 'alive');
      // Massacre: enquanto o chefão está em cena e a vacina não chegou, o remédio
      // morto só renasce depois que a vacina entra (para orbitá-la no duelo)
      p.respawnTimer = !vaccine && bossAlive ? VACCINE_ARRIVE - time + rand(2, 4) : rand(4, 7);
      p.target = null;
      spawnIcon(p.x, p.y, 'skull');
      for (let i = 0; i < 12; i++) spawnParticle(p.x, p.y, colors.virus, false);
      const bodyColor = p.palette.main;
      for (let i = 0; i < 3; i++) spawnParticle(p.x, p.y, bodyColor, true);
    };

    // Comemoração do herói: gira, pulinho e sparkles douradas
    const celebrate = (p: Pill) => {
      p.state = 'celebrate';
      p.celebrateTimer = 1.0;
      for (let i = 0; i < 7; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.5, 1.7);
        particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          life: 1,
          color: Math.random() > 0.5 ? '#fde047' : '#fbbf24',
          size: rand(1.2, 2.6),
          chunk: false,
          rotation: rand(0, Math.PI * 2),
          rotSpeed: rand(-0.2, 0.2),
        });
      }
    };

    const nearestAliveGerm = (fromX: number, fromY: number): Germ | null => {
      let best: Germ | null = null;
      let bestDist = Infinity;
      for (const g of germs) {
        if (g.state !== 'alive') continue;
        const d = Math.hypot(g.x - fromX, g.y - fromY);
        if (d < bestDist) {
          bestDist = d;
          best = g;
        }
      }
      return best;
    };

    // Vilão mais próximo que ainda não é caçado por outra cápsula (evita amontoar)
    const findFreeGerm = (fromX: number, fromY: number, claimed: Set<Germ>): Germ | null => {
      let best: Germ | null = null;
      let bestDist = Infinity;
      for (const g of germs) {
        if (g.state !== 'alive') continue;
        if (claimed.has(g)) continue;
        const d = Math.hypot(g.x - fromX, g.y - fromY);
        if (d < bestDist) {
          bestDist = d;
          best = g;
        }
      }
      return best;
    };

    // Onda de cura da vacina: mata os germes vivos (cada um vira coração ❤️).
    // Na última onda, nenhum germe escapa — todos viram corações de vitória
    const fireVaccineWave = (colors: typeof DARK, final = false) => {
      const v = vaccine;
      if (!v) return;
      v.waveT = VACCINE_WAVE_DUR;
      for (const g of germs) {
        if (final && g.state === 'dead') {
          // Já estava morto: ganha um coração extra e não renasce antes do fim
          spawnIcon(g.x, g.y, 'heart', true);
          g.respawnTimer = TOTAL_DURATION;
          continue;
        }
        if (g.state !== 'alive' && g.state !== 'hit') continue;
        if (g.isBoss && !final) {
          // Chefão RESISTE à onda: treme, solta faíscas e mantém o escudo —
          // somente o golpe final (última onda) consegue derrubá-lo
          g.stateTimer = Math.max(g.stateTimer, 0.7);
          g.flash = 1;
          for (let i = 0; i < 18; i++) spawnParticle(g.x, g.y, colors.virus, false);
          shockwaves.push({ x: g.x, y: g.y, radius: g.size * 0.5, maxRadius: g.size * 3.2, life: 1 });
          continue;
        }
        g.state = 'dying';
        g.deathScale = 1;
        if (g.isBoss) explodeBoss(g, colors, final);
        else explode(g, colors, final);
      }
      const diag = Math.hypot(width, height);
      shockwaves.push({ x: v.x, y: v.y, radius: 12, maxRadius: diag * 0.55, life: 1.2 });
      shockwaves.push({ x: v.x, y: v.y, radius: 6, maxRadius: diag, life: 1.5 });
      spawnIcon(v.x, v.y, 'heart', final);
      spawnIcon(v.x + rand(-16, 16), v.y + rand(-8, 8), 'heart', final);
      if (final) {
        // Chuva de corações: mais alguns espalhados para a comemoração final
        for (let i = 0; i < 6; i++) spawnIcon(rand(0, width), rand(0, height), 'heart', true);
      }
    };

    const update = (colors: typeof DARK) => {
      time += DT;

      // ---- Roteiro de 1 minuto: batalha (0–25s) → chefão massacra (25–35s) → vacina (35–60s) → fim ----

      // Chefão dos vilões: entra aos 25s — ANTES da vacina — e massacra os remédios
      if (time >= BOSS_SPAWN_TIME && !bossSpawned) {
        germs.push(spawnBoss());
        bossSpawned = true;
      }

      // A vacina entra aos 35s (após o massacre) e enfrenta o chefão até o fim
      if (!vaccine && time >= VACCINE_ARRIVE) {
        vaccine = {
          x: width / 2,
          y: height / 2,
          waveT: 0,
          nextWave: VACCINE_ARRIVE + VACCINE_WAVE_INTERVAL, // primeira onda aos 43s
          phase: rand(0, Math.PI * 2),
        };
        shockwaves.push({ x: vaccine.x, y: vaccine.y, radius: 10, maxRadius: width * 0.4, life: 1 });
      }
      if (vaccine) {
        vaccine.waveT -= DT;
        // Ondas de cura em horários fixos (43s e 51s)
        if (!finale && time >= vaccine.nextWave) {
          fireVaccineWave(colors);
          vaccine.nextWave += VACCINE_WAVE_INTERVAL;
        }
        // Última onda (58.5s): a vitória — mata tudo e os corações ficam na tela
        if (!finale && time >= FINALE_TIME) {
          finale = true;
          fireVaccineWave(colors, true);
        }
      }

      // ---- Germes: ciclo de vida + deriva browniana ----
      for (const g of germs) {
        if (g.state === 'hit') {
          g.stateTimer -= DT;
          g.flash = Math.max(g.flash - DT * 1.6, 0);
          g.x += rand(-1.2, 1.2);
          g.y += rand(-1.2, 1.2);
          if (g.stateTimer <= 0) {
            g.state = 'dying';
            explode(g, colors);
          }
          continue;
        }
        if (g.state === 'dying') {
          g.deathScale = Math.max(g.deathScale - 0.055, 0);
          if (g.deathScale <= 0) {
            g.state = 'dead';
            g.respawnTimer = rand(3, 6);
          }
          continue;
        }
        if (g.state === 'dead') {
          if (finale) continue; // batalha acabou — os germes não renascem mais
          g.respawnTimer -= DT;
          if (g.respawnTimer <= 0) Object.assign(g, spawnGerm(g.kind, true));
          continue;
        }
        // alive
        if (g.spawnScale < 1) g.spawnScale = Math.min(g.spawnScale + DT * 1.8, 1);
        if (g.stateTimer > 0) {
          // tremor ao levar golpe (boss)
          g.stateTimer -= DT;
          g.flash = Math.max(g.flash - DT * 1.6, 0);
          g.x += rand(-1.5, 1.5);
          g.y += rand(-1.5, 1.5);
        }
        g.vx += Math.sin(time * 0.9 + g.phase) * 0.012 + rand(-0.008, 0.008);
        g.vy += Math.cos(time * 0.75 + g.phase * 1.7) * 0.012 + rand(-0.008, 0.008);
        g.vx *= 0.985;
        g.vy *= 0.985;
        // ---- Luta: o vírus caça as pílulas desprevenidas ----
        g.attackCd = Math.max(g.attackCd - DT, 0);
        let prey: Pill | null = null;
        let preyDist = Infinity;
        for (const p of pills) {
          if (p.state !== 'idle') continue;
          const d = Math.hypot(p.x - g.x, p.y - g.y);
          if (d < preyDist) {
            preyDist = d;
            prey = p;
          }
        }
        const hunting = !!prey && preyDist < (g.isBoss ? 700 : 340);
        if (hunting && prey) {
          const dx = prey.x - g.x;
          const dy = prey.y - g.y;
          const d = Math.max(preyDist, 0.001);
          g.vx += (dx / d) * 0.06;
          g.vy += (dy / d) * 0.06;
        }
        const sp = Math.hypot(g.vx, g.vy);
        const maxSp = hunting ? 1.7 : 0.4 + 0.8 * g.depth;
        if (sp > maxSp) {
          g.vx = (g.vx / sp) * maxSp;
          g.vy = (g.vy / sp) * maxSp;
        }
        g.x += g.vx;
        g.y += g.vy;
        g.rotation += g.rotSpeed;
        bounce(g);
        // Luta: o vírus ataca a pílula desprevenida (ela vira caveira 💀). O chefão
        // golpeia mesmo as cápsulas que o enfrentam de frente — e mais rápido
        if (
          prey &&
          prey.state === 'idle' &&
          g.attackCd <= 0 &&
          (g.isBoss || prey.target !== g) &&
          Math.hypot(prey.x - g.x, prey.y - g.y) < g.size + prey.size + (g.isBoss ? 6 : 0)
        ) {
          g.attackCd = g.isBoss ? 0.9 : 1.2;
          killPill(prey, colors);
        }
      }

      // ---- Cursor = remédio: mata germes ao tocar (com cooldown) ----
      if (mouse.active) {
        for (const g of germs) {
          if (g.state !== 'alive') continue;
          const d = Math.hypot(g.x - mouse.x, g.y - mouse.y);
          if (d < g.size + 16 && !g.isBoss) hitGerm(g, colors); // chefão: só a vacina mata
        }
      }

      // ---- Repulsão suave entre germes vivos ----
      for (let i = 0; i < germs.length; i++) {
        const a = germs[i];
        if (a.state !== 'alive') continue;
        for (let j = i + 1; j < germs.length; j++) {
          const b = germs[j];
          if (b.state !== 'alive') continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = (a.size + b.size) * 0.8;
          if (d > 0.001 && d < min) {
            const push = ((min - d) / d) * 0.25;
            const px = dx * push;
            const py = dy * push;
            a.x -= px;
            a.y -= py;
            b.x += px;
            b.y += py;
          }
        }
      }

      // ---- Pílulas (heróis): caça com inércia, antecipação, rastro e comemoração ----
      for (const p of pills) {
        // Morta pelo vírus: vira caveira e renasce depois
        if (p.state === 'dead') {
          p.respawnTimer -= DT;
          if (p.respawnTimer <= 0) {
            const side = Math.floor(rand(0, 4));
            const pad = 40;
            if (side === 0) {
              p.x = rand(0, width);
              p.y = -pad;
            } else if (side === 1) {
              p.x = rand(0, width);
              p.y = height + pad;
            } else if (side === 2) {
              p.x = -pad;
              p.y = rand(0, height);
            } else {
              p.x = width + pad;
              p.y = rand(0, height);
            }
            p.state = 'idle';
            p.target = null;
            p.vx = rand(-0.4, 0.4);
            p.vy = rand(-0.4, 0.4);
            p.spawnScale = 0;
          }
          continue;
        }
        if (p.spawnScale < 1) p.spawnScale = Math.min(p.spawnScale + DT * 2, 1);
        // Comemoração: gira, desacelera e solta sparkles até o timer zerar
        if (p.state === 'celebrate') {
          p.celebrateTimer -= DT;
          p.celebrateSpin += 0.28;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += p.vx;
          p.y += p.vy;
          bounce(p);
          if (p.celebrateTimer <= 0) p.state = 'idle';
          continue;
        }

        const keepTarget =
          p.target &&
          p.target.state === 'alive' &&
          Math.hypot(p.target.x - p.x, p.target.y - p.y) < 520;
        const bossAlive = germs.find((g) => g.isBoss && g.state === 'alive') ?? null;
        if (!vaccine && bossAlive && !finale) {
          // Massacre: TODAS as cápsulas avançam no chefão (e ele as mata uma a uma)
          p.target = bossAlive;
        } else if (vaccine) {
          // Vacina em cena: as cápsulas param de caçar e se reúnem ao redor dela
          p.target = null;
          const vx = vaccine.x - p.x;
          const vy = vaccine.y - p.y;
          const vd = Math.max(Math.hypot(vx, vy), 0.001);
          if (vd > 100) {
            p.vx += (vx / vd) * PILL_STEER * 1.1;
            p.vy += (vy / vd) * PILL_STEER * 1.1;
          } else {
            // orbitam a vacina enquanto ela carrega
            const tang = Math.atan2(vy, vx) + Math.PI / 2;
            p.vx += Math.cos(tang) * PILL_STEER * 0.7;
            p.vy += Math.sin(tang) * PILL_STEER * 0.7;
          }
        } else if (!keepTarget) {
          // Cada cápsula caça um vilão diferente (evita acumulação no mesmo alvo)
          const claimed = new Set<Germ>();
          for (const other of pills) {
            if (other === p || !other.target || other.target.state !== 'alive') continue;
            claimed.add(other.target);
          }
          p.target = findFreeGerm(p.x, p.y, claimed) ?? nearestAliveGerm(p.x, p.y);
        }

        if (p.target) {
          const t = p.target;
          const tx = t.x + t.vx * LEAD_TIME * TARGET_FPS;
          const ty = t.y + t.vy * LEAD_TIME * TARGET_FPS;
          const dx = tx - p.x;
          const dy = ty - p.y;
          const d = Math.max(Math.hypot(dx, dy), 0.001);
          const steer = PILL_STEER * (0.5 + 0.5 * t.depth);
          p.vx += (dx / d) * steer;
          p.vy += (dy / d) * steer;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > PILL_MAX_SPEED) {
          p.vx = (p.vx / sp) * PILL_MAX_SPEED;
          p.vy = (p.vy / sp) * PILL_MAX_SPEED;
        }
        if (sp < 0.1) {
          p.vx += rand(-0.05, 0.05);
          p.vy += rand(-0.05, 0.05);
        }
        // O cursor lidera as cápsulas (atração quando ativo)
        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const md = Math.hypot(mdx, mdy);
          if (md > 1 && md < 400) {
            const steer = PILL_STEER * 1.3 * (1 - md / 400);
            p.vx += (mdx / md) * steer;
            p.vy += (mdy / md) * steer;
          }
        }
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += angDiff(p.rotation, Math.atan2(p.vy, p.vx)) * 0.12;
        bounce(p);

        p.hitCooldown = Math.max(p.hitCooldown - DT, 0);

        // Rastro de partículas atrás da cápsula
        if (Math.random() < 0.14) {
          particles.push({
            x: p.x + rand(-3, 3),
            y: p.y + rand(-3, 3),
            vx: rand(-0.15, 0.15),
            vy: rand(-0.25, 0.05),
            life: 1,
            color: `rgb(${p.palette.trailRgb})`,
            size: rand(1, 2.2),
            chunk: false,
            rotation: 0,
            rotSpeed: 0,
          });
        }

        for (const g of germs) {
          if (g.state !== 'alive') continue;
          if (g.isBoss) continue; // chefão: só a vacina mata
          const dx = g.x - p.x;
          const dy = g.y - p.y;
          if (Math.hypot(dx, dy) < g.size + p.size) {
            hitGerm(g, colors);
            celebrate(p);
          }
        }
      }

      // ---- Repulsão suave entre as cápsulas (não se amontoam, como os germes) ----
      for (let i = 0; i < pills.length; i++) {
        const a = pills[i];
        if (a.state === 'dead') continue;
        for (let j = i + 1; j < pills.length; j++) {
          const b = pills[j];
          if (b.state === 'dead') continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = (a.size + b.size) * 1.9;
          if (d > 0.001 && d < min) {
            const push = ((min - d) / d) * 0.15;
            const px = dx * push;
            const py = dy * push;
            a.x -= px;
            a.y -= py;
            b.x += px;
            b.y += py;
          }
        }
      }

      // ---- Partículas: fade exponencial + gravidade leve ----
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.02;
        pt.vx *= 0.99;
        pt.rotation += pt.rotSpeed;
        pt.life -= pt.life * 0.06;
        if (pt.life <= 0.02) particles.splice(i, 1);
      }
      if (particles.length > maxParticles) particles.splice(0, particles.length - maxParticles);

      // ---- Ondas de choque ----
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.12;
        sw.life -= DT * 1.1;
        if (sw.life <= 0) shockwaves.splice(i, 1);
      }

      // ---- Ícones (corações e caveiras): flutuam e somem devagar ----
      for (let i = icons.length - 1; i >= 0; i--) {
        const ic = icons[i];
        ic.y += ic.vy;
        if (ic.persistent) {
          // Corações do fim: flutuam para sempre (renascem embaixo ao sair do topo)
          if (ic.y < -30) {
            ic.y = height + 30;
            ic.x = rand(0, width);
          }
          continue;
        }
        ic.life -= DT * 0.2;
        if (ic.life <= 0) icons.splice(i, 1);
      }
    };

    // Olhar para o remédio mais próximo (ângulo no espaço local do corpo)
    const gazeAngleLocal = (g: Germ): number => {
      let best: Pill | null = null;
      let bestDist = Infinity;
      for (const p of pills) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      if (!best) return 0;
      return Math.atan2(best.y - g.y, best.x - g.x) - g.rotation;
    };

    // Rosto de monstro bravo: olhos vermelhos que seguem o remédio, sobrancelhas
    // raivosas, nariz e boca aberta com presas
    const drawFace = (
      ex1: number, ey1: number, er1: number,
      ex2: number, ey2: number, er2: number,
      mx: number, my: number, mrx: number, mry: number,
      localGaze: number,
      noseColor: string,
    ) => {
      const lookX = Math.cos(localGaze);
      const lookY = Math.sin(localGaze);

      // Brilho vermelho ao redor dos olhos
      ctx.fillStyle = 'rgba(239,68,68,0.3)';
      ctx.beginPath();
      ctx.arc(ex1, ey1, er1 * 1.5, 0, Math.PI * 2);
      ctx.arc(ex2, ey2, er2 * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Olhos vermelhos com contorno escuro
      ctx.fillStyle = 'rgba(239,68,68,0.95)';
      ctx.strokeStyle = 'rgba(17,24,39,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(ex1, ey1, er1, er1 * 1.1, 0, 0, Math.PI * 2);
      ctx.ellipse(ex2, ey2, er2, er2 * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupilas pretas (seguem o remédio)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(ex1 + lookX * er1 * 0.3, ey1 + lookY * er1 * 0.3, er1 * 0.5, 0, Math.PI * 2);
      ctx.arc(ex2 + lookX * er2 * 0.3, ey2 + lookY * er2 * 0.3, er2 * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Sobrancelhas raivosas (grossas, inclinadas para dentro)
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = Math.max(1.5, er1 * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex1 - er1 * 1.3, ey1 - er1 * 1.8);
      ctx.lineTo(ex1 + er1 * 0.55, ey1 - er1 * 1.0);
      ctx.moveTo(ex2 + er2 * 1.3, ey2 - er2 * 1.8);
      ctx.lineTo(ex2 - er2 * 0.55, ey2 - er2 * 1.0);
      ctx.stroke();

      // Nariz entre os olhos
      ctx.fillStyle = noseColor;
      ctx.beginPath();
      ctx.ellipse(0, ey1 + er1 * 0.7, er1 * 0.42, er1 * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boca aberta (torta para baixo) com presas
      ctx.fillStyle = 'rgba(17,24,39,0.95)';
      ctx.beginPath();
      ctx.moveTo(mx - mrx, my - mry * 0.4);
      ctx.quadraticCurveTo(mx, my + mry * 1.9, mx + mrx, my - mry * 0.1);
      ctx.lineTo(mx + mrx * 0.8, my - mry * 0.6);
      ctx.lineTo(mx - mrx * 0.8, my - mry * 0.6);
      ctx.closePath();
      ctx.fill();

      // Presas brancas (de cima para baixo)
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(mx - mrx * 0.55, my - mry * 0.6);
      ctx.lineTo(mx - mrx * 0.38, my + mry * 0.6);
      ctx.lineTo(mx - mrx * 0.2, my - mry * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + mrx * 0.2, my - mry * 0.6);
      ctx.lineTo(mx + mrx * 0.38, my + mry * 0.6);
      ctx.lineTo(mx + mrx * 0.55, my - mry * 0.6);
      ctx.closePath();
      ctx.fill();
    };

    const drawVirus = (g: Germ, baseColor: string, alpha: number) => {
      const s = g.size;
      const breathe = 1 + 0.06 * Math.sin(time * 2.2 + g.phase);
      // Cor oscila lentamente no tempo (variação de coloração)
      const color = hueRotate(baseColor, g.hueBase + Math.sin(time * g.hueSpeed + g.phase) * g.hueRange);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      ctx.scale(g.deathScale * g.spawnScale * breathe, g.deathScale * g.spawnScale * breathe);
      ctx.globalAlpha = alpha;

      const spikeColor = shade(color, 1.18 * g.tone);
      const bodyLight = shade(color, 1.5 * g.tone);
      const bodyDark = shade(color, 0.6 * g.tone);

      // Espinhos variados com cabeça arredondada (proteína S) — estável por germe
      const spikes = 8;
      ctx.fillStyle = spikeColor;
      for (let i = 0; i < spikes; i++) {
        const base = (i / spikes) * Math.PI * 2;
        const jitter = Math.sin(g.phase * 7 + i * 1.3) * 0.06;
        const len = s * (0.95 + Math.sin(g.phase * 3 + i * 2.1) * 0.15);
        ctx.save();
        ctx.rotate(base + jitter);
        ctx.beginPath();
        ctx.moveTo(s * 0.55, 0);
        ctx.lineTo(s * 1.02, -s * 0.16);
        ctx.lineTo(len, 0);
        ctx.lineTo(s * 1.02, s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(len + s * 0.06, 0, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Halo de envelope (membrana translúcida)
      ctx.strokeStyle = shade(color, 1.1 * g.tone);
      ctx.globalAlpha = alpha * 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha;

      // Corpo com gradiente radial (volume de esfera)
      const grad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s * 0.85);
      grad.addColorStop(0, bodyLight);
      grad.addColorStop(0.65, spikeColor);
      grad.addColorStop(1, bodyDark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Sombra interna na base
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0.9, 2.4);
      ctx.stroke();

      // Chifres de monstro
      const br = s * 0.6;
      const hh = br * 0.9;
      ctx.fillStyle = shade(color, 0.78 * g.tone);
      ctx.beginPath();
      ctx.moveTo(-br * 0.42, -br * 0.5);
      ctx.lineTo(-br * 0.66, -br * 0.5 - hh);
      ctx.lineTo(-br * 0.08, -br * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(br * 0.42, -br * 0.5);
      ctx.lineTo(br * 0.66, -br * 0.5 - hh);
      ctx.lineTo(br * 0.08, -br * 0.62);
      ctx.closePath();
      ctx.fill();

      // Rosto bravo (olhos vermelhos seguem o remédio + presas)
      drawFace(
        -br * 0.34, -br * 0.12, br * 0.22,
        br * 0.34, -br * 0.12, br * 0.22,
        0, br * 0.46, br * 0.3, br * 0.2,
        gazeAngleLocal(g),
        shade(color, 0.8),
      );

      // Escudo de tensão do chefão durante o duelo com a vacina: pulsa e treme
      // ao resistir às ondas — quebra apenas no golpe final (explodeBoss)
      if (g.isBoss && vaccine && !finale) {
        const shieldPulse = 1 + 0.07 * Math.sin(time * 7 + g.phase) + (g.stateTimer > 0 ? 0.06 : 0);
        ctx.strokeStyle = `rgba(239,68,68,${0.35 + g.flash * 0.5})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.95 * shieldPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(248,113,113,${0.15 + g.flash * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.08 * shieldPulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Coroa de chefão (boss)
      if (g.isBoss) {
        const cw = br * 0.95;
        const cy = -br * 1.7;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-cw * 0.5, cy);
        ctx.lineTo(-cw * 0.5, cy - cw * 0.45);
        ctx.lineTo(-cw * 0.25, cy - cw * 0.2);
        ctx.lineTo(0, cy - cw * 0.7);
        ctx.lineTo(cw * 0.25, cy - cw * 0.2);
        ctx.lineTo(cw * 0.5, cy - cw * 0.45);
        ctx.lineTo(cw * 0.5, cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(-cw * 0.5, cy - cw * 0.45, cw * 0.08, 0, Math.PI * 2);
        ctx.arc(0, cy - cw * 0.7, cw * 0.1, 0, Math.PI * 2);
        ctx.arc(cw * 0.5, cy - cw * 0.45, cw * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // Brilho especular
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.22, -s * 0.28, s * 0.16, s * 0.09, -0.6, 0, Math.PI * 2);
      ctx.fill();

      if (g.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${g.flash * 0.75 * alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawBacteria = (g: Germ, baseColor: string, alpha: number) => {
      const breathe = 1 + 0.06 * Math.sin(time * 2.2 + g.phase);
      // Cor oscila lentamente no tempo (variação de coloração)
      const color = hueRotate(baseColor, g.hueBase + Math.sin(time * g.hueSpeed + g.phase) * g.hueRange);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      ctx.scale(g.deathScale * g.spawnScale * breathe, g.deathScale * g.spawnScale * breathe);
      ctx.globalAlpha = alpha;
      const w = g.size * 1.8;
      const h = g.size * 0.75;
      const dark = shade(color, 0.75 * g.tone);

      // Flagelo (atrás do corpo) — com base e onda natural que afina na ponta
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 1, 0);
      const segs = 8;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        ctx.lineTo(
          w / 2 - 1 + t * 22,
          Math.sin(t * 5 + time * 7 + g.phase) * 4.5 * (1 - t * 0.4),
        );
      }
      ctx.stroke();

      // Pili/fímbrias (pelinhos ao redor, atrás do corpo)
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.8;
      const pili = 10;
      for (let i = 0; i < pili; i++) {
        const a = (i / pili) * Math.PI * 2 + g.phase * 0.3;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        const ex = (w / 2) * cx;
        const ey = (h / 2) * cy;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + cx * 3, ey + cy * 3);
        ctx.stroke();
      }

      // Corpo com gradiente cilíndrico (3D)
      const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grad.addColorStop(0, shade(color, 1.25 * g.tone));
      grad.addColorStop(0.5, shade(color, 1.0 * g.tone));
      grad.addColorStop(1, shade(color, 0.55 * g.tone));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fill();

      // Sombra interna
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, h / 2 - 1);
      ctx.stroke();

      // Núcleo com halo
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(-w * 0.15, 0, h * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(-w * 0.15, 0, h * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Ribossomos (pontinhos)
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 5; i++) {
        const a = g.phase + (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(w * 0.16 * Math.cos(a), h * 0.28 * Math.sin(a), 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Brilho especular
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.16, w * 0.32, h * 0.14, 0, 0, Math.PI);
      ctx.fill();

      // Chifres de monstro
      const hh = h * 0.9;
      ctx.fillStyle = shade(color, 0.78 * g.tone);
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.45);
      ctx.lineTo(-w * 0.42, -h * 0.45 - hh);
      ctx.lineTo(-w * 0.06, -h * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.3, -h * 0.45);
      ctx.lineTo(w * 0.42, -h * 0.45 - hh);
      ctx.lineTo(w * 0.06, -h * 0.55);
      ctx.closePath();
      ctx.fill();

      // Rosto bravo (olhos vermelhos seguem o remédio + presas)
      drawFace(
        -w * 0.22, -h * 0.08, h * 0.32,
        w * 0.22, -h * 0.08, h * 0.32,
        0, h * 0.38, h * 0.42, h * 0.26,
        gazeAngleLocal(g),
        shade(color, 0.8),
      );

      if (g.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${g.flash * 0.75 * alpha})`;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Rosto de herói: olhos que seguem o alvo + sobrancelhas determinadas + sorriso confiante
    const drawPillFace = (p: Pill, h: number) => {
      const celebrate = p.state === 'celebrate';
      let gaze = 0;
      if (p.target && p.target.state === 'alive') {
        gaze = Math.atan2(p.target.y - p.y, p.target.x - p.x) - p.rotation;
      }
      const lookX = Math.cos(gaze);
      const lookY = Math.sin(gaze);
      const ex = h * 0.3;
      const ey = -h * 0.08;
      const er = h * 0.26;

      if (celebrate) {
        // Olhos de felicidade ^^
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-ex - er * 0.7, ey + er * 0.5);
        ctx.lineTo(-ex, ey - er * 0.6);
        ctx.lineTo(-ex + er * 0.7, ey + er * 0.5);
        ctx.moveTo(ex - er * 0.7, ey + er * 0.5);
        ctx.lineTo(ex, ey - er * 0.6);
        ctx.lineTo(ex + er * 0.7, ey + er * 0.5);
        ctx.stroke();
      } else {
        // Olhos com pupilas que seguem o alvo
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.ellipse(-ex, ey, er, er * 1.15, 0, 0, Math.PI * 2);
        ctx.ellipse(ex, ey, er, er * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(-ex + lookX * er * 0.35, ey + lookY * er * 0.35, er * 0.5, 0, Math.PI * 2);
        ctx.arc(ex + lookX * er * 0.35, ey + lookY * er * 0.35, er * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Sobrancelhas determinadas
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-ex - er * 0.7, ey - er * 1.5);
        ctx.lineTo(-ex + er * 0.5, ey - er * 2.0);
        ctx.moveTo(ex + er * 0.7, ey - er * 1.5);
        ctx.lineTo(ex - er * 0.5, ey - er * 2.0);
        ctx.stroke();
      }

      // Sorriso confiante
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (celebrate) {
        ctx.moveTo(-h * 0.3, h * 0.42);
        ctx.quadraticCurveTo(0, h * 0.78, h * 0.3, h * 0.42);
      } else {
        ctx.moveTo(-h * 0.24, h * 0.38);
        ctx.quadraticCurveTo(0, h * 0.6, h * 0.24, h * 0.38);
      }
      ctx.stroke();
    };

    const drawPill = (p: Pill, alpha: number) => {
      const w = p.size * 2.1;
      const h = p.size * 0.95;
      const celebrate = p.state === 'celebrate';
      const hop = celebrate ? 1 + 0.1 * Math.abs(Math.sin(p.celebrateTimer * 16)) : 1;

      // Aura de herói (brilho suave na cor da cápsula)
      const aura = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      aura.addColorStop(0, `rgba(${p.palette.trailRgb},${0.16 * alpha})`);
      aura.addColorStop(1, `rgba(${p.palette.trailRgb},0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Sombra projetada (descola do fundo)
      ctx.globalAlpha = alpha * 0.22;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(p.x + 2, p.y + 3, w * 0.5, h * 0.5, p.rotation, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation + p.celebrateSpin);
      ctx.scale(hop * p.spawnScale, hop * p.spawnScale);
      ctx.globalAlpha = alpha;

      // Metade clara com gradiente 3D (cor própria da cápsula)
      const g1 = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g1.addColorStop(0, shade(p.palette.light, 1.3));
      g1.addColorStop(0.5, p.palette.light);
      g1.addColorStop(1, shade(p.palette.light, 0.6));
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w / 2, h, h / 2);
      ctx.fill();

      // Metade principal com gradiente 3D
      const g2 = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g2.addColorStop(0, shade(p.palette.main, 1.3));
      g2.addColorStop(0.5, p.palette.main);
      g2.addColorStop(1, shade(p.palette.main, 0.6));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.roundRect(0, -h / 2, w / 2, h, [0, h / 2, h / 2, 0]);
      ctx.fill();

      // Banda central de divisão (relevo)
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(-1.5, -h / 2, 3, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 1);
      ctx.lineTo(0, h / 2 - 1);
      ctx.stroke();

      // Gloss especular (faixa curva de gel)
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.2, w * 0.38, h * 0.2, 0, 0, Math.PI);
      ctx.fill();

      // Halo dourado (curador)
      ctx.strokeStyle = 'rgba(251,191,36,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -h * 1.0, h * 0.42, h * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      const haloGlow = ctx.createRadialGradient(0, -h * 1.0, 0, 0, -h * 1.0, h * 0.55);
      haloGlow.addColorStop(0, 'rgba(251,191,36,0.35)');
      haloGlow.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = haloGlow;
      ctx.beginPath();
      ctx.arc(0, -h * 1.0, h * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Rosto de herói
      drawPillFace(p, h);

      ctx.restore();
    };

    // Chefão bom: a vacina (seringa com cruz de saúde) — carrega e dispara a onda
    const drawVaccine = (v: Vaccine, alpha: number) => {
      const pulse = 1 + 0.07 * Math.sin(time * 5 + v.phase);
      const waveProg = v.waveT > 0 ? 1 - v.waveT / VACCINE_WAVE_DUR : 0;

      if (waveProg > 0) {
        // Onda de cura expansiva (acabou de disparar)
        const glowR = (24 + waveProg * 300) * sizeScale;
        const glow = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, glowR);
        glow.addColorStop(0, `rgba(191,219,254,${0.55 * alpha})`);
        glow.addColorStop(1, 'rgba(191,219,254,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(v.x, v.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(147,197,253,${0.6 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, glowR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (!finale) {
        // Anel de contagem: pulsa mais forte conforme a próxima onda se aproxima
        const until = v.nextWave - time;
        const progress = Math.min(Math.max(1 - until / VACCINE_WAVE_INTERVAL, 0), 1);
        const r = (16 + progress * 26) * pulse * sizeScale;
        ctx.strokeStyle = `rgba(96,165,250,${0.2 + progress * 0.5})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(96,165,250,${0.1 + progress * 0.25})`;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(Math.sin(time * 0.9 + v.phase) * 0.05);
      ctx.scale(pulse * sizeScale, pulse * sizeScale);
      ctx.globalAlpha = alpha;

      // Apoio do êmbolo
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-8, -30, 16, 5, 2);
      ctx.fill();
      // Haste do êmbolo
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -25, 4, 8);
      // Corpo (cilindro) com gradiente
      const bg = ctx.createLinearGradient(-7, 0, 7, 0);
      bg.addColorStop(0, '#93c5fd');
      bg.addColorStop(0.5, '#f8fafc');
      bg.addColorStop(1, '#60a5fa');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(-7, -18, 14, 30, 4);
      ctx.fill();
      // Cruz de saúde
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2.5, -8, 5, 12);
      ctx.fillRect(-6, -4.5, 12, 5);
      // Agulha
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-3, 12);
      ctx.lineTo(3, 12);
      ctx.lineTo(1.2, 26);
      ctx.lineTo(-1.2, 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-1.2, 26);
      ctx.lineTo(1.2, 26);
      ctx.lineTo(0, 30);
      ctx.closePath();
      ctx.fill();
      // Gloss especular
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-3.2, -4, 1.8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Halo dourado (herói máximo)
      ctx.strokeStyle = 'rgba(251,191,36,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -34, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Vitória: um coração pulsa flutuando acima da vacina (fica no meio da tela)
      if (finale) {
        const bob = Math.sin(time * 2.5 + v.phase) * 6;
        const hs = (13 + 2 * Math.sin(time * 5 + v.phase)) * sizeScale;
        const hx = v.x;
        const hy = v.y - 48 * sizeScale + bob;
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, hs * 2.2);
        glow.addColorStop(0, 'rgba(244,63,94,0.5)');
        glow.addColorStop(1, 'rgba(244,63,94,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(hx, hy, hs * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(hx, hy + hs * 0.35);
        ctx.bezierCurveTo(hx - hs, hy - hs * 0.5, hx - hs * 0.45, hy - hs * 0.95, hx, hy - hs * 0.28);
        ctx.bezierCurveTo(hx + hs * 0.45, hy - hs * 0.95, hx + hs, hy - hs * 0.5, hx, hy + hs * 0.35);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(hx - hs * 0.3, hy - hs * 0.45, hs * 0.18, hs * 0.1, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = (colors: typeof DARK) => {
      if (!ctx || width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      // Rede dos vilões (vermelha, orgânica): traço tracejado animado = infecção rastejando
      const virusRgb = toRgb(colors.virus).join(',');
      ctx.lineCap = 'round';
      for (let i = 0; i < germs.length; i++) {
        const a = germs[i];
        if (a.state !== 'alive') continue;
        for (let j = i + 1; j < germs.length; j++) {
          const b = germs[j];
          if (b.state !== 'alive') continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const alpha = Math.max(0.08, (1 - d / 600) * 0.3);
          // brilho por baixo (camada larga e fraca)
          ctx.strokeStyle = `rgba(${virusRgb},${alpha * 0.35})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          // traço orgânico: tracejado com deslocamento animado (infecção rastejando)
          ctx.strokeStyle = `rgba(${virusRgb},${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.setLineDash([3, 6]);
          ctx.lineDashOffset = -time * 12 + i * 13 + j * 7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.lineCap = 'butt';

      for (const g of germs) {
        if (g.deathScale <= 0) continue;
        const baseAlpha = colors === LIGHT ? 0.55 : 0.5;
        const alpha = (g.state === 'alive' ? baseAlpha : 0.65) * (0.45 + 0.65 * g.depth);
        if (g.kind === 'virus') drawVirus(g, colors.virus, alpha);
        else drawBacteria(g, colors.bacteria, alpha);
      }

      // Rede dos mocinhos (verde, energia): linha sólida com pulso de energia viajando
      const particleRgb = toRgb(colors.particle).join(',');
      for (let i = 0; i < pills.length; i++) {
        for (let j = i + 1; j < pills.length; j++) {
          const a = pills[i];
          const b = pills[j];
          if (a.state === 'dead' || b.state === 'dead') continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const alpha = Math.max(0.15, (1 - d / 500) * 0.4);
          // brilho por baixo (camada larga e fraca)
          ctx.strokeStyle = `rgba(${particleRgb},${alpha * 0.3})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          // linha sólida
          ctx.strokeStyle = `rgba(${particleRgb},${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          // pulso de energia viajando entre os aliados
          const t = (((time * 0.5 + i * 0.17 + j * 0.29) % 1) + 1) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          ctx.fillStyle = `rgba(${particleRgb},${0.5 * alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const p of pills) {
        if (p.state === 'dead') continue;
        drawPill(p, colors === LIGHT ? 0.85 : 0.8);
      }

      if (vaccine) drawVaccine(vaccine, colors === LIGHT ? 0.95 : 0.9);

      // ---- Tensão vacina × chefão: feixe de energia pulsante entre os dois ----
      // Enquanto a vacina e o chefão estão em cena (antes do golpe final), um
      // raio de tensão os conecta, pulsando mais forte perto do golpe final
      const bossAlive = germs.find((g) => g.isBoss && g.state === 'alive');
      if (vaccine && bossAlive && !finale) {
        const bx = bossAlive.x;
        const by = bossAlive.y;
        const dx = bx - vaccine.x;
        const dy = by - vaccine.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const nx = -dy / dist;
        const ny = dx / dist;
        // Intensidade cresce conforme o golpe final se aproxima
        const tension = 0.45 + 0.55 * Math.min((time - VACCINE_ARRIVE) / (FINALE_TIME - VACCINE_ARRIVE), 1);
        const flicker = 0.7 + 0.3 * Math.sin(time * 18);
        // Raio principal (vermelho, o chefão)
        ctx.strokeStyle = `rgba(239,68,68,${(0.35 + 0.45 * tension) * flicker})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(vaccine.x, vaccine.y);
        ctx.quadraticCurveTo(
          (vaccine.x + bx) / 2 + nx * Math.sin(time * 14) * 14,
          (vaccine.y + by) / 2 + ny * Math.sin(time * 14) * 14,
          bx,
          by,
        );
        ctx.stroke();
        // Raio secundário (azul, a vacina) — deslocado, cria o efeito de duelo
        ctx.strokeStyle = `rgba(96,165,250,${(0.3 + 0.4 * tension) * flicker})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(vaccine.x, vaccine.y);
        ctx.quadraticCurveTo(
          (vaccine.x + bx) / 2 - nx * Math.sin(time * 14 + 2) * 14,
          (vaccine.y + by) / 2 - ny * Math.sin(time * 14 + 2) * 14,
          bx,
          by,
        );
        ctx.stroke();
        // Faíscas de energia percorrendo o feixe
        for (let i = 0; i < 4; i++) {
          const t = (((time * 0.6 + i * 0.25) % 1) + 1) % 1;
          const ex = vaccine.x + dx * t + nx * Math.sin(time * 20 + i * 3) * 10;
          const ey = vaccine.y + dy * t + ny * Math.sin(time * 20 + i * 3) * 10;
          ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tension})`;
          ctx.beginPath();
          ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Aura de tensão ao redor do chefão
        const bossGlow = ctx.createRadialGradient(bx, by, 0, bx, by, bossAlive.size * 2.6);
        bossGlow.addColorStop(0, `rgba(239,68,68,${0.25 * tension})`);
        bossGlow.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = bossGlow;
        ctx.beginPath();
        ctx.arc(bx, by, bossAlive.size * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const sw of shockwaves) {
        const grad = ctx.createRadialGradient(sw.x, sw.y, 0, sw.x, sw.y, sw.radius);
        grad.addColorStop(0, `rgba(${colors.glowRgb},${0.35 * sw.life})`);
        grad.addColorStop(1, `rgba(${colors.glowRgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * sw.life})`;
        ctx.lineWidth = 1.5 + 2 * sw.life;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ícones: corações (vacina venceu) e caveiras (vírus venceu)
      for (const ic of icons) {
        const pulse = 1 + 0.12 * Math.sin(time * 5 + ic.phase);
        const glowColor = ic.kind === 'heart' ? '244,63,94' : '148,163,184';
        const glow = ctx.createRadialGradient(ic.x, ic.y, 0, ic.x, ic.y, ic.size * 1.8);
        glow.addColorStop(0, `rgba(${glowColor},${0.45 * ic.life})`);
        glow.addColorStop(1, `rgba(${glowColor},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ic.x, ic.y, ic.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(ic.x, ic.y);
        ctx.scale(pulse, pulse);
        ctx.globalAlpha = ic.life;
        if (ic.kind === 'heart') {
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(0, ic.size * 0.35);
          ctx.bezierCurveTo(-ic.size, -ic.size * 0.5, -ic.size * 0.45, -ic.size * 0.95, 0, -ic.size * 0.28);
          ctx.bezierCurveTo(ic.size * 0.45, -ic.size * 0.95, ic.size, -ic.size * 0.5, 0, ic.size * 0.35);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.ellipse(-ic.size * 0.3, -ic.size * 0.45, ic.size * 0.18, ic.size * 0.1, -0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Caveira: crânio + mandíbula, órbitas, nariz e dentes
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, -ic.size * 0.06, ic.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(-ic.size * 0.42, ic.size * 0.14, ic.size * 0.84, ic.size * 0.46, ic.size * 0.14);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-ic.size * 0.22, -ic.size * 0.1, ic.size * 0.16, 0, Math.PI * 2);
          ctx.arc(ic.size * 0.22, -ic.size * 0.1, ic.size * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-ic.size * 0.06, ic.size * 0.04);
          ctx.lineTo(ic.size * 0.06, ic.size * 0.04);
          ctx.lineTo(0, ic.size * 0.18);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-ic.size * 0.24, ic.size * 0.2);
          ctx.lineTo(-ic.size * 0.24, ic.size * 0.5);
          ctx.moveTo(0, ic.size * 0.2);
          ctx.lineTo(0, ic.size * 0.5);
          ctx.moveTo(ic.size * 0.24, ic.size * 0.2);
          ctx.lineTo(ic.size * 0.24, ic.size * 0.5);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      for (const pt of particles) {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        if (pt.chunk) {
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rotation);
          ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;
      if (timestamp - lastFrameTime < FRAME_INTERVAL) return;
      lastFrameTime = timestamp;

      const colors = getColors();
      update(colors);
      draw(colors);
    };

    init();
    if (prefersReduced) {
      // Acessibilidade: desenha um único frame estático
      draw(getColors());
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="covid-background">
      <canvas ref={canvasRef} className="covid-canvas" />
      <div className="bg-blobs">
        <div className="blob blob-teal"></div>
      </div>
    </div>
  );
};

export default CyberBackground;
