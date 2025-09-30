#!/usr/bin/env node
/*
Calibration and validation CLI for WASM/WebGL/WebGPU samples.

Usage:
  node tools/calibrate.js ingest    # compute calibration bands from samples
  node tools/calibrate.js validate  # run simple regression vs expected.json

Inputs:
  docs/device-database/samples/*.json  (exported from enhanced-detection.html)
  docs/device-database/expected.json   (optional: { "sample_file": "Apple|Intel|AMD|..." })

Outputs:
  docs/device-database/calibration.json
  docs/device-database/regression-report.json (for validate)
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_DIR = path.resolve(ROOT, 'docs', 'device-database');
const SAMPLES_DIR = path.join(DB_DIR, 'samples');

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f));
}

function quantiles(values) {
  if (!values.length) return {};
  const sorted = [...values].sort((a,b)=>a-b);
  const q = p => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { min: sorted[0], q25: q(0.25), median: q(0.5), q75: q(0.75), max: sorted[sorted.length-1] };
}

function normalizeVendor(sample) {
  const v = (sample?.webgpu?.adapter?.vendor || sample?.webgl?.basic?.vendor || '').toString().toLowerCase();
  if (v.includes('apple')) return 'apple';
  if (v.includes('intel')) return 'intel';
  if (v.includes('amd')) return 'amd';
  if (v.includes('nvidia')) return 'nvidia';
  return 'other';
}

function extractBands(sample) {
  const mem = sample?.wasm?.memoryResults || {};
  const ratios = Object.entries(mem).map(([k,v]) => {
    const m = /^(\d+)KB$/.exec(k); if (!m) return null;
    const size = parseInt(m[1],10);
    const r = (typeof v?.ratio === 'number') ? v.ratio : NaN;
    return isNaN(r) ? null : { size, ratio: r };
  }).filter(Boolean);
  const l1 = ratios.filter(x => x.size>=32 && x.size<=64).map(x=>x.ratio);
  const deep = ratios.filter(x => x.size>=256).map(x=>x.ratio);
  const overall = ratios.map(x=>x.ratio);
  return {
    l1: l1.length ? quantiles(l1) : null,
    deep: deep.length ? quantiles(deep) : null,
    overall: overall.length ? quantiles(overall) : null
  };
}

function ingest() {
  const files = listJson(SAMPLES_DIR);
  if (!files.length) {
    console.error(`No samples in ${SAMPLES_DIR}. Export from the page first.`);
    process.exit(1);
  }
  const groups = { apple: [], intel: [], amd: [], nvidia: [], other: [] };

  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      const fam = normalizeVendor(data);
      const bands = extractBands(data);
      groups[fam].push(bands);
    } catch (e) {
      console.warn(`Skip ${f}: ${e.message}`);
    }
  }

  function mergeQuantile(arr, key) {
    const vals = arr.map(x => x?.[key]?.median).filter(x => typeof x === 'number');
    if (!vals.length) return null;
    const qs = quantiles(vals);
    // Expand to a band by ± IQR factor
    const iqr = qs.q75 - qs.q25;
    const expansion = Math.max(0.25 * iqr, 0.08);
    return {
      min: Math.max(0, qs.q25 - expansion),
      median: qs.median,
      max: qs.q75 + expansion,
      support: vals.length
    };
  }

  const calibration = {};
  for (const fam of Object.keys(groups)) {
    const arr = groups[fam];
    calibration[fam] = {
      l1: mergeQuantile(arr, 'l1'),
      deep: mergeQuantile(arr, 'deep'),
      overall: mergeQuantile(arr, 'overall')
    };
  }

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(path.join(DB_DIR, 'calibration.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    samples: files.length,
    bands: calibration
  }, null, 2));
  console.log(`✅ Wrote calibration.json from ${files.length} samples.`);
}

function classifyUsingBands(sample, bandsAll) {
  const b = extractBands(sample);
  const l1 = b.l1?.median;
  const deep = b.deep?.median;
  const vendor = normalizeVendor(sample);
  const scores = {};
  for (const fam of Object.keys(bandsAll)) {
    const famBands = bandsAll[fam] || {};
    let s = 0;
    const addBand = (val, band, w) => {
      if (typeof val !== 'number' || !band) return;
      const { min, max, median } = band;
      if (typeof min === 'number' && typeof max === 'number') {
        // z-like: distance to median normalized by band width
        const width = Math.max(1e-6, max - min);
        const z = Math.abs(val - median) / width;
        s += Math.max(0, (1.0 - Math.min(1, z))) * w;
      }
    };
    addBand(l1, famBands.l1, 0.6);
    addBand(deep, famBands.deep, 0.4);
    // simple vendor gate
    if (vendor === 'apple' && fam === 'apple') s += 0.3;
    if (vendor === 'intel' && fam === 'intel') s += 0.2;
    if (vendor === 'amd' && fam === 'amd') s += 0.2;
    scores[fam] = s;
  }
  const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return best ? { family: best[0], score: best[1], vendor } : { family: 'other', score: 0, vendor };
}

function validate() {
  const calibPath = path.join(DB_DIR, 'calibration.json');
  if (!fs.existsSync(calibPath)) {
    console.error('Run ingest first to produce calibration.json');
    process.exit(1);
  }
  const bandsAll = JSON.parse(fs.readFileSync(calibPath, 'utf8')).bands || {};
  const expectedPath = path.join(DB_DIR, 'expected.json');
  const expected = fs.existsSync(expectedPath) ? JSON.parse(fs.readFileSync(expectedPath, 'utf8')) : {};
  const files = listJson(SAMPLES_DIR);
  const report = [];
  let correct = 0, total = 0;

  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      const pred = classifyUsingBands(data, bandsAll);
      const exp = expected[path.basename(f)] || null;
      const ok = exp ? (pred.family === exp.toLowerCase()) : null;
      if (ok === true) correct++;
      if (ok !== null) total++;
      report.push({ file: path.basename(f), predicted: pred.family, score: +pred.score.toFixed(3), vendor: pred.vendor, expected: exp, ok });
    } catch (e) {
      report.push({ file: path.basename(f), error: e.message });
    }
  }

  const summary = { generatedAt: new Date().toISOString(), total, correct, accuracy: total ? +(correct/total).toFixed(3) : null };
  const out = { summary, report };
  fs.writeFileSync(path.join(DB_DIR, 'regression-report.json'), JSON.stringify(out, null, 2));
  console.log(`✅ Wrote regression-report.json (${correct}/${total} correct)`);
}

const cmd = process.argv[2] || 'ingest';
if (cmd === 'ingest') ingest();
else if (cmd === 'validate') validate();
else { console.log('Usage: node tools/calibrate.js [ingest|validate]'); process.exit(1); }
