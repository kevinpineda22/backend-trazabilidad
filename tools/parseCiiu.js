import fs from "fs";

const rawPath = new URL("./rawCiiu.txt", import.meta.url);
const rawContent = fs.readFileSync(rawPath, "utf8");
const lines = rawContent.split(/\r?\n/);

const map = new Map();
let buffer = "";
const isCodeLine = (line) => /^\d{3,4}\s/.test(line.trim());

const flushBuffer = () => {
  if (!buffer) return;
  const match = buffer.trim().match(/^(\d{3,4})\s+(.+)$/);
  if (match) {
    const code = match[1];
    const description = match[2]
      .replace(/\s+/g, " ")
      .replace(/^"|"$/g, "")
      .trim();
    if (!map.has(code)) {
      map.set(code, description);
    }
  }
  buffer = "";
};

for (const line of lines) {
  if (!line.trim()) {
    flushBuffer();
    continue;
  }
  if (isCodeLine(line)) {
    flushBuffer();
    buffer = line.trim();
  } else {
    buffer += " " + line.trim();
  }
}
flushBuffer();

const result = Array.from(map.entries()).map(([code, description]) => ({
  code,
  description,
  label: `${code} - ${description}`,
}));

const jsonPath = new URL("./ciiuCodes.json", import.meta.url);
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf8");

const jsPath = new URL(
  "../trazabilidad_contabilidad/data/ciiuCodes.js",
  import.meta.url
);
const jsContent = `// Lista de códigos CIIU generada automáticamente.\n// Se exporta como array ordenado por código.\nexport const CIIU_CODES = ${JSON.stringify(
  result,
  null,
  2
)};\n`;
fs.mkdirSync(new URL("../trazabilidad_contabilidad/data/", import.meta.url), {
  recursive: true,
});
fs.writeFileSync(jsPath, jsContent, "utf8");

console.log(`Generated ${result.length} CIIU entries at ${jsonPath.pathname}`);
console.log(`Created JS module at ${jsPath.pathname}`);
