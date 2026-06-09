import fs from 'node:fs/promises';
import path from 'node:path';
import Replicate from 'replicate';

const ENV_PATH = 'c:/Users/LENOVO/Documents/LearnChinese/ChunkyChineseVocab/.env';
const WORLD_JSON_PATH = 'c:/Users/LENOVO/Documents/LearnChinese/ChunkyChineseVocab/public/reader-packs/lms-books/visual-novels/worlds/royal-road-prototype/world.json';
const OUTPUT_DIR = 'c:/Users/LENOVO/Documents/LearnChinese/ChunkyChineseVocab/public/cards';

async function main() {
  // Load API key
  const envContent = await fs.readFile(ENV_PATH, 'utf-8');
  const replicateApiKey = envContent.match(/REPLICATE_API_KEY=(.*)/)?.[1]?.trim();
  if (!replicateApiKey) {
    throw new Error('REPLICATE_API_KEY not found in .env');
  }

  const replicate = new Replicate({ auth: replicateApiKey });

  // Read world JSON to get cards
  const worldData = JSON.parse(await fs.readFile(WORLD_JSON_PATH, 'utf-8'));
  const cards = worldData.cards || {};

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const [cardId, cardDef] of Object.entries(cards)) {
    const cardName = cardDef.name?.english || cardId;
    const cardDesc = cardDef.description?.english || '';
    
    console.log(`Generating image for ${cardId} (${cardName})...`);

    const prompt = `A Trading Card Game illustration for the card "${cardName}". ${cardDesc}. Artwork style heavily inspired by Mabinogi Duel or classic Pokemon TCG art. Clean, colorful, dynamic composition, fantasy anime art style, 2d illustration, highly detailed.`;

    try {
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            aspect_ratio: "2:3",
            output_format: "webp",
            output_quality: 90
          }
        }
      );

      let url;
      if (Array.isArray(output) && output.length > 0) {
        url = output[0];
      } else if (typeof output === 'string') {
        url = output;
      } else if (typeof output === 'object') {
        if (output && output[0]) {
          url = output[0];
        }
      }

      if (!url) {
         // handle object shape from replicate sdk
         if (output.url) url = output.url;
         else if (typeof output === 'object' && output.url) url = output.url();
         else url = Array.isArray(output) ? output[0] : String(output);
      }

      console.log(`Downloading ${url}...`);
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const outputPath = path.join(OUTPUT_DIR, `${cardId}.webp`);
      await fs.writeFile(outputPath, buffer);
      
      console.log(`Saved ${cardId}.webp`);
    } catch (e) {
      console.error(`Failed to generate/save image for ${cardId}:`, e);
    }
  }

  console.log('Finished generating cards.');
}

main().catch(console.error);
