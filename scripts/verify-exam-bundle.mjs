import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const assets = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(assets).filter(name => name.endsWith('.js'));
if (!files.length) throw new Error('Build the frontend first.');
const fixture = JSON.parse(readFileSync(new URL('../server/fixtures/local-exam.json', import.meta.url), 'utf8'));
const privateMarkers = fixture.flatMap(item => [item.correctOptionId, item.explanation]).filter(Boolean);
// Also reject former artboard grading keys; only trivial public controls remain.
privateMarkers.push('accepted:["Legitimlik"]', 'accepted:["Demonstraciya"');
for (const name of files) {
  const source = readFileSync(fileURLToPath(new URL(name,assets)), 'utf8');
  for (const marker of privateMarkers) if (source.includes(marker)) throw new Error('Private exam fixture leaked into browser asset: ' + name);
}
console.log(`Verified ${files.length} browser chunks: private exam canaries and archived grading keys are absent.`);
