import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('.env not found — create it with GEMINI_API_KEY');
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '');
  }
}

const MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];

const IMAGES = [
  {
    name: 'hero-bg.jpg',
    aspect: '16:9',
    prompt:
      'Cinematic ultra-wide dark editing suite at night, professional colorist workstation silhouetted against glowing monitor arrays showing video timeline interfaces, volumetric haze, dramatic low-key lighting with subtle teal-and-amber accents, deep blacks, shallow depth of field, film grain, anamorphic feel, photorealistic, negative space in center for typography'
  },
  {
    name: 'hero-bg-2.jpg',
    aspect: '16:9',
    prompt:
      'Moody cinematic film review room, large projection screen glowing in darkness with a video frame visible, silhouettes of two reviewers watching, volumetric light beams, dust particles in air, deep black shadows, amber rim light, photorealistic, subtle film grain, wide composition with dark negative space in center'
  }
];

async function generateImage(model, { prompt, aspect }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: aspect }
        }
      })
    }
  );
  if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error(`${model} returned no image: ${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(img.inlineData.data, 'base64');
}

async function main() {
  loadEnv();
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
  const outDir = join(ROOT, 'public', 'brand');
  mkdirSync(outDir, { recursive: true });
  let failures = 0;
  for (const spec of IMAGES) {
    let done = false;
    for (const model of MODELS) {
      try {
        console.log(`→ ${spec.name} via ${model} ...`);
        const buf = await generateImage(model, spec);
        writeFileSync(join(outDir, spec.name), buf);
        console.log(`✓ ${spec.name} saved (${(buf.length / 1024).toFixed(0)} KB)`);
        done = true;
        break;
      } catch (e) {
        console.warn(`✗ ${e.message}`);
      }
    }
    if (!done) {
      console.error(`FAILED: ${spec.name}`);
      failures++;
    }
  }
  process.exitCode = failures ? 1 : 0;
}

main();
