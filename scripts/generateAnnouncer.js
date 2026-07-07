// Generates 180 individual announcer clips via Higgsfield API (text2speech_v2 + elevenlabs + Harrison voice).
// Saves to assets/sounds/announcer/ and updates downloadAnnouncer.js with the URLs.
// Run with: node scripts/generateAnnouncer.js [--dry-run]
// Requires: HIGGSFIELD_API_KEY env var

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds', 'announcer');
const HARRISON_VOICE_ID = '573e5163-59b3-4926-aab1-951ef2985f81';
const MODEL = 'text2speech_v2';
const VARIANT = 'elevenlabs';

// Number-to-words conversion for announcer prompts (ALL CAPS with exclamation mark).
function scoreToText(n) {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  if (n === 100) return 'ONE HUNDRED!';
  if (n >= 101 && n <= 109) return `ONE HUNDRED ${scoreToText(n - 100)}`;
  if (n >= 110 && n <= 119) return `ONE HUNDRED ${scoreToText(n - 100)}`;
  if (n >= 120 && n <= 180) {
    const rem = n % 10;
    const tens_digit = Math.floor(n / 10);
    if (rem === 0) return `${tens[tens_digit]}!`;
    return `${tens[tens_digit]} ${ones[rem]}!`;
  }

  if (n < 10) return `${ones[n]}!`;
  if (n < 20) return `${teens[n - 10]}!`;
  const rem = n % 10;
  const tens_digit = Math.floor(n / 10);
  if (rem === 0) return `${tens[tens_digit]}!`;
  return `${tens[tens_digit]} ${ones[rem]}!`;
}

// For testing: generate all score texts
function generateScoreTexts() {
  const texts = {};
  for (let i = 1; i <= 180; i++) {
    texts[i] = scoreToText(i);
  }
  return texts;
}

// Call Higgsfield API to generate a single clip
async function generateClip(scoreNum, prompt) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey) {
    throw new Error('HIGGSFIELD_API_KEY env var not set');
  }

  const payload = {
    params: {
      model: MODEL,
      prompt: prompt,
      voice_type: 'preset',
      voice_id: HARRISON_VOICE_ID,
      variant: VARIANT,
      count: 1,
    },
  };

  const response = await fetch('https://api.higgsfield.ai/v1/audio/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();
  return result;
}

// Poll for job completion
async function waitForJobCompletion(jobId, apiKey, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching job status`);
    }

    const result = await response.json();
    if (result.status === 'completed') {
      return result;
    }
    if (result.status === 'failed') {
      throw new Error(`Job failed: ${result.error || 'unknown error'}`);
    }

    // Wait 1 second before polling again
    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error(`Job did not complete within ${maxAttempts} seconds`);
}

// Download generated audio file to local path
async function downloadAudio(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} downloading audio`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apiKey = process.env.HIGGSFIELD_API_KEY;

  if (!dryRun && !apiKey) {
    console.error('ERROR: HIGGSFIELD_API_KEY env var required for actual generation');
    console.error('Dry run: node scripts/generateAnnouncer.js --dry-run');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const scoreTexts = generateScoreTexts();
  const urls = {};
  const failed = [];

  console.log(`Generating ${Object.keys(scoreTexts).length} announcer clips (${dryRun ? 'DRY RUN' : 'LIVE'})...\n`);

  for (const [scoreNum, text] of Object.entries(scoreTexts)) {
    const filename = `score_${scoreNum}.mp3`;

    if (dryRun) {
      console.log(`${filename}: "${text}"`);
      continue;
    }

    try {
      console.log(`[${scoreNum}/180] Generating ${filename}: "${text}"...`);

      // Generate via API
      const genResult = await generateClip(parseInt(scoreNum), text);
      const jobId = genResult.job_id || genResult.id;

      // Poll for completion
      const completed = await waitForJobCompletion(jobId, apiKey);
      const audioUrl = completed.output?.[0]?.url || completed.media?.[0]?.url;

      if (!audioUrl) {
        throw new Error('No audio URL in response');
      }

      // Download to local file
      const destPath = path.join(OUT_DIR, filename);
      await downloadAudio(audioUrl, destPath);
      const size = fs.statSync(destPath).size;

      urls[filename] = audioUrl;
      console.log(`  ✓ OK ${filename} (${size} bytes) → ${audioUrl}`);
    } catch (err) {
      failed.push({ filename, error: err.message });
      console.error(`  ✗ FAIL ${filename}: ${err.message}`);
    }

    // Rate limit: 1 request per 0.5s to avoid API throttling
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${dryRun ? 'Dry run complete.' : `Generated ${Object.keys(urls).length} clips.`}`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} failures:`);
    failed.forEach(({ filename, error }) => {
      console.error(`  - ${filename}: ${error}`);
    });
    if (!dryRun) process.exit(1);
  }

  // Update downloadAnnouncer.js with new URLs (if live run)
  if (!dryRun && Object.keys(urls).length > 0) {
    const existingScript = fs.readFileSync(path.join(__dirname, 'downloadAnnouncer.js'), 'utf8');
    const filesStart = existingScript.indexOf('const FILES = {');
    const filesEnd = existingScript.indexOf('};', filesStart) + 2;
    const beforeFiles = existingScript.substring(0, filesStart);
    const afterFiles = existingScript.substring(filesEnd);

    const filesObj = Object.entries(urls)
      .map(([filename, url]) => `  '${filename}': '${url}'`)
      .join(',\n');

    const newScript = `${beforeFiles}const FILES = {\n${filesObj},\n}${afterFiles}`;
    fs.writeFileSync(path.join(__dirname, 'downloadAnnouncer.js'), newScript);
    console.log('\n✓ Updated downloadAnnouncer.js with new URLs');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
