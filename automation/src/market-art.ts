import type { Quote } from "./market";
const glyphs: Record<string, string[]> = {
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "%": ["11001", "11010", "00100", "00100", "01000", "10110", "00110"],
};
function crc(b: Uint8Array) {
  let c = 0xffffffff;
  for (const x of b) {
    c ^= x;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
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
export async function marketArtwork(quotes: Quote[], captured: string) {
  const w = 1200,
    h = 630,
    stride = w * 3 + 1,
    raw = new Uint8Array(stride * h),
    svg: string[] = [];
  const rgb = (c: string) =>
    [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const pixel = (x: number, y: number, c: number[]) => {
    if (x >= 0 && x < w && y >= 0 && y < h) raw.set(c, y * stride + 1 + x * 3);
  };
  function box(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    svg.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}"/>`,
    );
    const c = rgb(color);
    for (let yy = Math.max(0, y); yy < Math.min(h, y + height); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(w, x + width); xx++)
        pixel(xx, yy, c);
  }
  function text(
    value: string,
    x: number,
    y: number,
    scale = 4,
    color = "#d6ad62",
  ) {
    for (const ch of value.toUpperCase()) {
      const bits = glyphs[ch];
      if (bits)
        for (let row = 0; row < 7; row++)
          for (let col = 0; col < 5; col++)
            if (bits[row][col] === "1")
              box(x + col * scale, y + row * scale, scale, scale, color);
      x += scale * 6;
    }
  }
  box(0, 0, w, h, "#0d1014");
  box(45, 40, 1110, 2, "#80683a");
  text("ECONOFLUX MARKETS", 65, 65, 5);
  text("24H %", 65, 123, 3, "#aeb3bb");
  const scale = Math.max(1, ...quotes.map((q) => Math.abs(q.change24h!)));
  for (const [i, q] of quotes.entries()) {
    const x = 90 + i * 370,
      change = q.change24h!,
      height = Math.max(2, Math.round((Math.abs(change) / scale) * 85)),
      y = change >= 0 ? 345 - height : 345,
      c = change > 0 ? "#499a76" : change < 0 ? "#b95f56" : "#aeb3bb";
    box(x - 18, 177, 320, 320, "#171b20");
    box(x - 10, 345, 300, 2, "#766446");
    box(x + 85, y, 92, height, c);
    box(
      x + 177,
      y + 8,
      12,
      Math.max(1, height - 8),
      change >= 0 ? "#32684f" : "#743c36",
    );
    box(x + 85, Math.max(178, y - 5), 92, 5, "#d6ad62");
    text(q.symbol, x, 205, 5);
    text((change > 0 ? "+" : "") + change.toFixed(2) + "%", x, 433, 5, c);
    text("USD " + q.price.toFixed(2), x, 475, 3, "#e7e0d0");
  }
  text(captured.replace("T", " ").slice(0, 16) + " UTC", 65, 555, 3, "#aeb3bb");
  box(45, 605, 1110, 2, "#80683a");
  const compressed = new Uint8Array(
    await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );
  const ihdr = new Uint8Array(13),
    v = new DataView(ihdr.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array()),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    png.set(p, at);
    at += p.length;
  }
  return {
    png,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${svg.join("")}</svg>`,
  };
}
