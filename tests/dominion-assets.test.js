import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {COSMETIC_TYPES, cosmeticMotion} from '../src/lib/cosmetic-collection.js';

const directory = new URL('../public/assets/collection/dominion/', import.meta.url);

test('every premium slot resolves to delivered animation and reduced-motion artwork', async () => {
  const manifest = JSON.parse(await readFile(new URL('motion-manifest.json', directory), 'utf8'));
  assert.equal(manifest.assets.length, 4);
  const delivered = new Set(manifest.assets.flatMap(asset => asset.outputs.map(file => file.file)));
  for (const type of COSMETIC_TYPES) {
    const motion = cosmeticMotion(`${type}-collection-dominion`);
    for (const file of Object.values(motion)) assert.ok(delivered.has(file.split('/').at(-1)), file);
  }
  for (const asset of manifest.assets) {
    for (const output of asset.outputs) {
      const bytes = await readFile(new URL(output.file, directory));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), output.sha256, output.file);
      const metadata = await sharp(bytes, {animated: true}).metadata();
      const animated = !output.file.includes('-poster');
      assert.equal(metadata.pages || 1, animated ? 32 : 1, output.file);
      if (animated) {
        assert.equal(metadata.loop, 0, output.file);
        assert.equal(metadata.delay.reduce((sum, delay) => sum + delay, 0), 2880, output.file);
        const frames = await Promise.all([0, 16].map(page => sharp(bytes, {page, pages: 1}).raw().toBuffer()));
        assert.notDeepEqual(frames[0], frames[1], `${output.file} must visibly animate`);
      }
      if (['avatar', 'crest'].includes(asset.name)) {
        assert.equal(metadata.hasAlpha, true, output.file);
        const {data, info} = await sharp(bytes, {page: 0, pages: 1}).ensureAlpha().raw().toBuffer({resolveWithObject: true});
        for (const pixel of [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1]) {
          assert.equal(data[pixel * 4 + 3], 0, `${output.file} must retain transparent corners`);
        }
      }
    }
  }
});
