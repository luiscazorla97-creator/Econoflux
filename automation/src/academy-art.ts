/** Original EconoFlux vector diagrams and matching social PNGs. No image service,
 * third-party photographs, fonts, network calls or paid image generation. */
type Point = [number, number];
type Shape = { p: Point[]; fill: string; stroke?: string };
const gold = "#d6ad62",
  light = "#f4d89c",
  dark = "#29251e";
export function diagramShapes(
  category: string,
  seed: number,
  subject = "",
): Shape[] {
  const shapes: Shape[] = [];
  const poly = (p: Point[], fill: string, stroke = gold) =>
    shapes.push({ p, fill, stroke });
  const box = (x: number, y: number, w: number, h: number, fill = dark) =>
    poly(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      fill,
    );
  const offset = seed % 35;
  for (let i = 0; i < 4; i++)
    box(100 + i * 295, 470 + (i % 2) * 18, 100, 7, "#3c3424");
  if (category === "bitcoin") {
    // A coin and peer-to-peer ledger nodes; no market chart or price claim.
    const coin: Point[] = Array.from({ length: 48 }, (_, i) => [
      600 + 140 * Math.cos((i * Math.PI) / 24),
      280 + 140 * Math.sin((i * Math.PI) / 24),
    ]);
    poly(coin, dark, light);
    box(548, 205, 25, 150, gold);
    box(566, 205, 87, 22, gold);
    box(566, 268, 87, 22, gold);
    box(566, 333, 87, 22, gold);
    box(638, 221, 25, 53, gold);
    box(638, 287, 25, 52, gold);
    box(580, 185, 10, 22, gold);
    box(607, 185, 10, 22, gold);
    box(580, 355, 10, 22, gold);
    box(607, 355, 10, 22, gold);
    for (const [x, y] of [
      [295, 155],
      [840, 155],
      [295, 355],
      [840, 355],
    ]) {
      box(x, y, 65, 65);
      box(x + 12, y + 15, 40, 5, gold);
      box(x + 12, y + 32, 30, 5, light);
      poly(
        [
          [x + 32, y + 65],
          [x + 36, y + 65],
          [x < 600 ? 470 : 730, 300],
        ],
        gold,
      );
    }
  } else if (category === "ethereum" && /bitcoin-differences/.test(subject)) {
    // Bitcoin ledger blocks opposite Ethereum execution/contract geometry.
    box(310, 220, 155, 150);
    box(332, 243, 110, 20, gold);
    box(332, 282, 110, 20, gold);
    box(332, 321, 70, 20, light);
    poly(
      [
        [520, 274],
        [620, 274],
        [620, 264],
        [655, 290],
        [620, 316],
        [620, 306],
        [520, 306],
      ],
      gold,
    );
    poly(
      [
        [820, 125],
        [725, 285],
        [820, 337],
        [915, 285],
      ],
      light,
    );
    poly(
      [
        [725, 309],
        [820, 455],
        [915, 309],
        [820, 359],
      ],
      dark,
    );
    box(1010, 240, 75, 110);
    box(1022, 260, 50, 5, gold);
    box(1022, 280, 40, 5, light);
  } else if (category === "ethereum" && /staking/.test(subject)) {
    // Validator nodes around a consensus symbol, rather than a yield graph.
    poly(
      [
        [600, 155],
        [520, 280],
        [600, 325],
        [680, 280],
      ],
      light,
    );
    poly(
      [
        [520, 300],
        [600, 420],
        [680, 300],
        [600, 344],
      ],
      dark,
    );
    for (const [x, y] of [
      [330, 180],
      [795, 180],
      [330, 355],
      [795, 355],
    ]) {
      box(x, y, 85, 65);
      box(x + 15, y + 18, 55, 6, gold);
      box(x + 15, y + 36, 35, 6, light);
      poly(
        [
          [x + 85, y + 30],
          [x + 85, y + 34],
          [x < 600 ? 515 : 685, 285],
        ],
        gold,
      );
      box(x + 10, y + 75, 65, 12);
      box(x + 20, y + 91, 45, 10, gold);
    }
  } else if (category === "technology" && /layer-2/.test(subject)) {
    // Execution layers above a base ledger, with explicit connection paths.
    for (let i = 0; i < 3; i++) {
      const y = 190 + i * 115;
      poly(
        [
          [330, y],
          [770, y],
          [875, y + 55],
          [435, y + 55],
        ],
        i === 0 ? light : dark,
      );
      poly(
        [
          [435, y + 55],
          [875, y + 55],
          [875, y + 76],
          [435, y + 76],
        ],
        "#332b20",
      );
      for (let j = 0; j < 4; j++)
        box(470 + j * 80, y + 18, 35, 15, i === 0 ? dark : gold);
    }
    box(385, 260, 6, 45, gold);
    box(825, 375, 6, 45, gold);
  } else if (category === "defi") {
    // A liquidity pool and application nodes: conceptual, without returns.
    poly(
      [
        [500, 210],
        [700, 210],
        [750, 270],
        [700, 370],
        [500, 370],
        [450, 270],
      ],
      dark,
    );
    poly(
      [
        [520, 235],
        [680, 235],
        [710, 275],
        [675, 300],
        [525, 300],
        [490, 275],
      ],
      light,
    );
    box(558, 322, 85, 18, gold);
    for (const [x, y] of [
      [285, 160],
      [820, 160],
      [285, 350],
      [820, 350],
    ]) {
      box(x, y, 95, 75);
      box(x + 17, y + 18, 60, 7, gold);
      box(x + 17, y + 37, 40, 7, light);
      poly(
        [
          [x + 48, y + 75],
          [x + 52, y + 75],
          [x < 600 ? 465 : 735, 285],
        ],
        gold,
      );
    }
  } else if (category === "exchanges") {
    // Custodial hub on the left, peer-to-peer contract network on the right.
    box(365, 245, 120, 115);
    box(390, 267, 70, 12, gold);
    box(390, 294, 70, 12, light);
    for (const [x, y] of [
      [290, 155],
      [490, 155],
      [390, 410],
    ]) {
      box(x, y, 45, 45);
      poly(
        [
          [x + 20, y + 22],
          [x + 24, y + 22],
          [425, 300],
        ],
        gold,
      );
    }
    for (const [x, y] of [
      [780, 180],
      [690, 370],
      [895, 370],
    ])
      box(x, y, 70, 70);
    poly(
      [
        [815, 250],
        [820, 250],
        [730, 370],
        [725, 370],
      ],
      gold,
    );
    poly(
      [
        [825, 250],
        [830, 250],
        [935, 370],
        [930, 370],
      ],
      gold,
    );
    box(760, 402, 135, 4, gold);
  } else if (category === "security") {
    poly(
      [
        [600, 100],
        [775, 165],
        [750, 330],
        [685, 420],
        [600, 465],
        [515, 420],
        [450, 330],
        [425, 165],
      ],
      "#30291c",
    );
    poly(
      [
        [600, 127],
        [742, 181],
        [718, 320],
        [660, 397],
        [600, 432],
        [540, 397],
        [482, 320],
        [458, 181],
      ],
      "#14181c",
      light,
    );
    if (/wallet|custody/.test(subject)) {
      box(505, 240, 190, 106);
      box(525, 263, 90, 57, "#10171a");
      box(643, 280, 24, 24, gold);
    } else if (/recovery|phrase|backup/.test(subject)) {
      box(510, 210, 130, 145, "#171d21");
      box(555, 245, 130, 145, "#252923");
      for (let i = 0; i < 5; i++) box(572, 265 + i * 22, 92, 3, gold);
    } else {
      poly(
        [
          [520, 276],
          [566, 321],
          [686, 207],
          [706, 229],
          [567, 366],
          [500, 298],
        ],
        gold,
        light,
      );
    }
  } else if (category === "ethereum" && /contract/.test(subject)) {
    box(330, 155, 270, 270);
    box(350, 175, 230, 230, "#11171b");
    for (let i = 0; i < 6; i++)
      box(370, 205 + i * 30, 80 + (i % 3) * 37, 4, i % 2 ? gold : light);
    poly(
      [
        [665, 290],
        [720, 260],
        [720, 320],
      ],
      gold,
    );
    poly(
      [
        [855, 160],
        [775, 290],
        [855, 335],
        [935, 290],
      ],
      light,
    );
    poly(
      [
        [775, 310],
        [855, 435],
        [935, 310],
        [855, 355],
      ],
      dark,
    );
  } else if (category === "ethereum") {
    poly(
      [
        [600, 85],
        [489, 278],
        [600, 330],
      ],
      dark,
    );
    poly(
      [
        [600, 85],
        [711, 278],
        [600, 330],
      ],
      gold,
      light,
    );
    poly(
      [
        [489, 298],
        [600, 470],
        [600, 350],
      ],
      "#4b4130",
    );
    poly(
      [
        [711, 298],
        [600, 470],
        [600, 350],
      ],
      light,
    );
    box(839, 300, 63, 120);
    box(924, 240, 63, 180);
    box(1009, 180, 63, 240, gold);
  } else if (category === "exchanges" || category === "stablecoins") {
    box(399, 184, 162, 210);
    box(639, 184, 162, 210);
    poly(
      [
        [580, 211],
        [620, 240],
        [580, 269],
      ],
      gold,
    );
    poly(
      [
        [620, 310],
        [580, 339],
        [620, 368],
      ],
      light,
    );
    box(431, 227, 98, 20, gold);
    box(671, 333, 98, 20, gold);
  } else if (category === "regulation") {
    box(580, 175, 40, 260, gold);
    box(460, 425, 280, 26);
    box(425, 160, 350, 14, gold);
    poly(
      [
        [425, 200],
        [350, 320],
        [500, 320],
      ],
      dark,
    );
    poly(
      [
        [775, 200],
        [700, 320],
        [850, 320],
      ],
      dark,
    );
  } else {
    for (let i = 0; i < 3; i++) {
      const x = 355 + i * 190,
        y = 185 + (i % 2) * 70;
      poly(
        [
          [x, y],
          [x + 82, y - 44],
          [x + 164, y],
          [x + 82, y + 44],
        ],
        light,
      );
      poly(
        [
          [x, y],
          [x + 82, y + 44],
          [x + 82, y + 160],
          [x, y + 116],
        ],
        "#58482d",
      );
      poly(
        [
          [x + 82, y + 44],
          [x + 164, y],
          [x + 164, y + 116],
          [x + 82, y + 160],
        ],
        dark,
      );
    }
  }
  box(145, 150 + offset, 150, 4, gold);
  box(145, 180 + offset, 105, 4, "#51462e");
  // A topic signature keeps even closely related diagrams visually distinct.
  for (let i = 0; i < Math.min(subject.length, 48); i++)
    for (let bit = 0; bit < 7; bit++)
      if (subject.charCodeAt(i) & (1 << bit))
        box(845 + i * 5, 550 + bit * 5, 3, 3, "#6c5734");
  return shapes;
}
const rgb = (s: string) =>
  [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
function crc(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Uint8Array) {
  const out = new Uint8Array(data.length + 12),
    v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  out.set(new TextEncoder().encode(name), 4);
  out.set(data, 8);
  v.setUint32(out.length - 4, crc(out.subarray(4, out.length - 4)));
  return out;
}
export async function academyArtwork(id: string, category: string) {
  const seed = [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7),
    shapes = diagramShapes(category, seed, id);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><defs><radialGradient id="bg"><stop stop-color="#29251d"/><stop offset="1" stop-color="#0c1014"/></radialGradient><linearGradient id="edge" x2=".4" y2="1"><stop stop-color="#fff0c2"/><stop offset=".35" stop-color="#d6ad62"/><stop offset="1" stop-color="#806032"/></linearGradient><linearGradient id="metal" x2=".7" y2="1"><stop stop-color="#51442e"/><stop offset=".45" stop-color="#24231e"/><stop offset="1" stop-color="#13181c"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><ellipse cx="600" cy="500" rx="400" ry="45" fill="#07090c"/>${shapes.map((s) => `<polygon points="${s.p.map((p) => p.join(",")).join(" ")}" fill="${[gold, light].includes(s.fill) ? "url(#edge)" : s.fill === dark ? "url(#metal)" : s.fill}" stroke="${s.stroke || gold}" stroke-width="2" stroke-linejoin="round"/>`).join("")}<path d="M80 553H1120" stroke="#665235"/><text x="80" y="590" fill="#d6ad62" font-family="sans-serif" font-size="18" letter-spacing="6">ECONOFLUX · ACADEMY</text></svg>`;
  // A compact raster counterpart for social crawlers that cannot display SVG.
  const w = 1200,
    h = 630,
    stride = w * 3 + 1,
    raw = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * stride + 1 + x * 3,
        g = Math.max(0, 1 - Math.hypot((x - 600) / 700, (y - 290) / 430));
      raw[i] = 12 + Math.round(22 * g);
      raw[i + 1] = 16 + Math.round(17 * g);
      raw[i + 2] = 20 + Math.round(9 * g);
    }
  for (const s of shapes) {
    const color = rgb(s.fill),
      min = Math.max(0, Math.ceil(Math.min(...s.p.map((p) => p[1])))),
      max = Math.min(h - 1, Math.floor(Math.max(...s.p.map((p) => p[1]))));
    for (let y = min; y <= max; y++) {
      const xs: number[] = [];
      for (let j = 0; j < s.p.length; j++) {
        const a = s.p[j],
          b = s.p[(j + 1) % s.p.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
          xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      xs.sort((a, b) => a - b);
      for (let j = 0; j + 1 < xs.length; j += 2)
        for (
          let x = Math.max(0, Math.ceil(xs[j]));
          x <= Math.min(w - 1, Math.floor(xs[j + 1]));
          x++
        ) {
          const i = y * stride + 1 + x * 3;
          for (let c = 0; c < 3; c++)
            raw[i + c] = Math.round(
              color[c] * (1.12 - ((y - min) / Math.max(1, max - min)) * 0.3),
            );
        }
    }
    const c = rgb(s.stroke || gold);
    for (let j = 0; j < s.p.length; j++) {
      const a = s.p[j],
        b = s.p[(j + 1) % s.p.length],
        n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(a[0] + ((b[0] - a[0]) * k) / n),
          y = Math.round(a[1] + ((b[1] - a[1]) * k) / n);
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const i = y * stride + 1 + x * 3;
          raw.set(c, i);
        }
      }
    }
  }
  const compressed = new Uint8Array(
    await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );
  const ihdr = new Uint8Array(13),
    view = new DataView(ihdr.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("tEXt", new TextEncoder().encode("EconoFlux topic\0" + id)),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array()),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    png.set(p, at);
    at += p.length;
  }
  return { svg, png };
}
