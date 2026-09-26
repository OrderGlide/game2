// Generate an image with Gemini. Key is read ONLY from process.env.GEMINI_API_KEY.
// usage: node tools/gemini/image.mjs <out.png> "<prompt>" [model] [aspect]
import { writeFileSync } from 'node:fs';

const [out, prompt, model = 'gemini-3-pro-image', aspect = '16:9'] = process.argv.slice(2);
const key = process.env.GEMINI_API_KEY;
if (!key || !out || !prompt) { console.error('usage: GEMINI_API_KEY=... node image.mjs out.png "prompt" [model] [aspect]'); process.exit(1); }

const body = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
};
for (let attempt = 1; attempt <= 3; attempt++) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body),
  });
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (part) { writeFileSync(out, Buffer.from(part.inlineData.data, 'base64')); console.log('ok', out); process.exit(0); }
  console.error(`attempt ${attempt} failed:`, res.status, JSON.stringify(json.error ?? json.candidates?.[0]?.finishReason ?? json).slice(0, 300));
  await new Promise((r) => setTimeout(r, 3000 * attempt));
}
process.exit(2);
