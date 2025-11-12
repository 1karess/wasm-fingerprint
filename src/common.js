// Shared WASM initialization and utility functions
// Shared WASM initialization and utility functions
class WASMFingerprint {
    constructor() {
        this.wasmModule = null;
        this._calibration = null;
        this._simdSupport = undefined;
        this._simdBenchmark = null;
        this._workerProfile = null;
    }

    async initWASM() {
        if (this.wasmModule) return this.wasmModule;
        try {
            this.wasmModule = await WASMModule();
            return this.wasmModule;
        } catch (error) {
            console.error('WASM loading failed:', error);
            throw error;
        }
    }

    // High-precision timing memory test function
    timedTest(testFunc, ...args) {
        const startTime = performance.now();
        const result = testFunc(...args);
        const endTime = performance.now();
        return {
            result: result,
            time: endTime - startTime
        };
    }

    // Memory access test (adaptive timing, debounce)
    async runMemoryTests(sizes = [16, 32, 64, 256], baseIterations = 200, targetRsd = 0.07) {
        const Module = await this.initWASM();
        const results = {};

        const statsOf = (arr) => {
            if (!arr.length) return { mean: 0, std: 0, rsd: 1, median: 0 };
            const sorted = [...arr].sort((a, b) => a - b);
            const n = sorted.length;
            const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
            const cut = Math.max(1, Math.floor(n * 0.15)); // Stronger truncation 15%
            const trimmed = sorted.slice(cut, Math.max(cut + 1, n - cut));
            const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            const variance = trimmed.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / Math.max(1, trimmed.length - 1);
            const std = Math.sqrt(Math.max(0, variance));
            const rsd = mean > 0 ? std / mean : 1;
            return { mean, std, rsd, median, n };
        };

        const nextTick = () => new Promise((res) => {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => res());
            else setTimeout(res, 0);
        });

        async function measurePair(size, iters) {
            // Do lightweight cache eviction first to reduce impact from previous test
            try { Module._random_access_test(8192, 3); } catch(_e) {}
            const t0 = performance.now(); Module._sequential_access_test(size, iters); const t1 = performance.now();
            const seq = t1 - t0;
            await nextTick();
            const r0 = performance.now(); Module._random_access_test(size, iters); const r1 = performance.now();
            const rnd = r1 - r0;
            return { seq, rnd, ratio: (rnd > 0 && seq > 0) ? (rnd / seq) : NaN };
        }

        for (const size of sizes) {
            let iters = baseIterations;
            let pairs = [];
            // Do one paired measurement first
            pairs.push(await measurePair(size, iters));

            // Scale up workload until stable and measurable (upper limit to prevent explosion)
            const maxIters = 20000;
            let guard = 0;
            while (guard++ < 8) {
                const seqTimes = pairs.map(p => p.seq).filter(x => x > 0);
                const rndTimes = pairs.map(p => p.rnd).filter(x => x > 0);
                const sStats = statsOf(seqTimes);
                const rStats = statsOf(rndTimes);
                const tooFast = (sStats.median < 0.4 || rStats.median < 0.4);
                const tooNoisy = (sStats.rsd > targetRsd || rStats.rsd > targetRsd);
                if (!tooFast && !tooNoisy && pairs.length >= 5) break;
                iters = Math.min(maxIters, Math.floor(iters * 1.8));
                // Append paired samples
                pairs.push(await measurePair(size, iters));
            }

            // Use median of "paired ratios" to resist Safari jitter
            const ratioSamples = pairs.map(p => p.ratio).filter(x => isFinite(x) && x > 0);
            ratioSamples.sort((a,b)=>a-b);
            const ratioMedian = ratioSamples.length ? ratioSamples[Math.floor(ratioSamples.length/2)] : 'Too Fast';
            const sStats = statsOf(pairs.map(p => p.seq));
            const rStats = statsOf(pairs.map(p => p.rnd));

            results[`${size}KB`] = {
                sequential: { time: sStats.median, mean: sStats.mean, rsd: sStats.rsd, iterations: iters },
                random: { time: rStats.median, mean: rStats.mean, rsd: rStats.rsd, iterations: iters },
                ratio: ratioMedian
            };
        }

        return results;
    }

    // Calculation performance test
    async runComputeTests() {
        const Module = await this.initWASM();

        return {
            float: this.timedTest(Module._float_precision_test.bind(Module), 10000),
            integer: this.timedTest(Module._integer_optimization_test.bind(Module), 10000),
            vector: this.timedTest(Module._vector_computation_test.bind(Module), 1000),
            branch: this.timedTest(Module._branch_prediction_test.bind(Module), 5000)
        };
    }

    // Load calibration thresholds (if exists)
    async loadCalibration() {
        if (this._calibration) return this._calibration;
        try {
            // Browser environment try to load
            if (typeof fetch === 'function') {
                const res = await fetch('./docs/device-database/calibration.json', { cache: 'no-store' });
                if (res.ok) {
                    this._calibration = await res.json();
                    if (typeof window !== 'undefined') {
                        window.__WASM_CALIBRATION__ = this._calibration;
                    }
                    return this._calibration;
                }
        }
        } catch (_e) {}
        this._calibration = null;
        return null;
    }

    // Measure stride access time (milliseconds, robust statistics)
    async measureStrideTimes(sizeKB = 512, strides = [64, 128, 256, 512, 4096], iterations = 200) {
        const Module = await this.initWASM();
        const out = {};
        const samplesPerStride = 3;

        for (const s of strides) {
            const times = [];
            // Warm-up
            try { Module._stride_access_test(sizeKB, s, Math.max(1, Math.floor(iterations/4))); } catch(_e) {}
            for (let i = 0; i < samplesPerStride; i++) {
                const t0 = performance.now();
                Module._stride_access_test(sizeKB, s, iterations);
                const t1 = performance.now();
                times.push(t1 - t0);
            }
            times.sort((a,b)=>a-b);
            const median = times[Math.floor(times.length/2)];
            out[s] = median;
        }
        return out;
    }

    async profileWorkerCapacity(maxProbe = 24) {
        if (this._workerProfile) {
            return this._workerProfile;
        }

        if (typeof Worker === 'undefined') {
            this._workerProfile = {
                available: false,
                hardwareConcurrency: typeof navigator === 'object' ? navigator?.hardwareConcurrency ?? null : null,
                spawned: 0,
                tested: 0,
                medianLatency: null,
                meanLatency: null,
                failureReason: 'Worker API unavailable'
            };
            return this._workerProfile;
        }

        const hardwareConcurrency = typeof navigator === 'object' && typeof navigator?.hardwareConcurrency === 'number'
            ? navigator.hardwareConcurrency
            : null;

        const upperBound = Math.max(1, Math.min(maxProbe, hardwareConcurrency ? Math.max(hardwareConcurrency * 2, hardwareConcurrency + 2) : maxProbe));

        const workerScript = `self.onmessage = function(evt) {
    var data = evt && evt.data || {};
    if (data.type === 'ping') {
        self.postMessage({ type: 'pong', index: data.index || 0 });
    } else if (data.type === 'stop') {
        self.postMessage({ type: 'stopped' });
        try { self.close(); } catch (e) {}
    }
};`;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const workers = [];
        const latencies = [];
        let spawned = 0;
        let failureReason = null;

        const median = (arr) => {
            if (!arr.length) return null;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const mean = (arr) => {
            if (!arr.length) return null;
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        };

        try {
            for (let i = 0; i < upperBound; i++) {
                let worker;
                try {
                    worker = new Worker(workerUrl, { name: `probe-${i}` });
                } catch (err) {
                    failureReason = err;
                    break;
                }

                workers.push(worker);

                const latency = await new Promise((resolve, reject) => {
                    const start = performance.now();
                    const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error('worker handshake timeout'));
                    }, 400);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        worker.removeEventListener('message', onMessage);
                        worker.removeEventListener('error', onError);
                    };

                    const onMessage = (event) => {
                        const data = event && event.data;
                        if (!data || data.type !== 'pong' || (data.index ?? i) !== i) {
                            return;
                        }
                        const end = performance.now();
                        cleanup();
                        resolve(end - start);
                    };

                    const onError = (err) => {
                        cleanup();
                        reject(err instanceof Error ? err : new Error(String(err)));
                    };

                    worker.addEventListener('message', onMessage);
                    worker.addEventListener('error', onError);
                    worker.postMessage({ type: 'ping', index: i });
                }).catch((err) => {
                    failureReason = err;
                    return null;
                });

                if (typeof latency === 'number' && isFinite(latency)) {
                    latencies.push(latency);
                    spawned += 1;
                } else {
                    break;
                }
            }
        } finally {
            for (const worker of workers) {
                try { worker.postMessage({ type: 'stop' }); } catch (_e) {}
                try { worker.terminate(); } catch (_e) {}
            }
            URL.revokeObjectURL(workerUrl);
        }

        this._workerProfile = {
            available: true,
            hardwareConcurrency,
            spawned,
            tested: upperBound,
            medianLatency: median(latencies),
            meanLatency: mean(latencies),
            failureReason: failureReason ? (failureReason.message || String(failureReason)) : null
        };

        return this._workerProfile;
    }

    async detectSIMDSupport() {
        if (typeof this._simdSupport === 'boolean') {
            return this._simdSupport;
        }

        if (typeof WebAssembly !== 'object' || typeof WebAssembly.validate !== 'function') {
            this._simdSupport = false;
            return this._simdSupport;
        }

        // Minimal module borrowed from wasm-feature-detect to probe SIMD support
        const simdModuleBytes = new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0,
            10, 11, 1, 9, 0, 65, 0, 253, 15, 11
        ]);

        try {
            if (!WebAssembly.validate(simdModuleBytes)) {
                this._simdSupport = false;
                return this._simdSupport;
            }
            await WebAssembly.compile(simdModuleBytes);
            this._simdSupport = true;
        } catch (_err) {
            this._simdSupport = false;
        }

        return this._simdSupport;
    }

    async measureSIMDCharacteristics(computeResults = null) {
        if (this._simdBenchmark) {
            return this._simdBenchmark;
        }

        const supported = await this.detectSIMDSupport();
        const baseline = computeResults || await this.runComputeTests();
        const vectorTime = baseline?.vector?.time;
        const integerTime = baseline?.integer?.time;

        const hasTimes = typeof vectorTime === 'number' && vectorTime > 0 &&
            typeof integerTime === 'number' && integerTime > 0;

        const speedup = supported && hasTimes ? (integerTime / vectorTime) : null;
        const vectorRatio = hasTimes ? (vectorTime / integerTime) : null;

        this._simdBenchmark = {
            supported,
            speedup,
            vectorRatio
        };

        return this._simdBenchmark;
    }

    // Generate device fingerprint
    async generateFingerprint() {
        const Module = await this.initWASM();
        const memoryResults = await this.runMemoryTests();
        const computeResults = await this.runComputeTests();
        const simdBenchmark = await this.measureSIMDCharacteristics(computeResults);
        const workerProfile = await this.profileWorkerCapacity();
        // Low-level structure detection
        let l1 = null, l2 = null, l3 = null, cacheLine = null, tlb = null;
        try { l1 = Module._l1_cache_size_detection ? Module._l1_cache_size_detection(320) : null; } catch(_e) {}
        try { l2 = Module._l2_cache_size_detection ? Module._l2_cache_size_detection(20480) : null; } catch(_e) {}
        try { l3 = Module._l3_cache_size_detection ? Module._l3_cache_size_detection(64) : null; } catch(_e) {}
        try { cacheLine = Module._cache_line_size_detection ? Module._cache_line_size_detection() : null; } catch(_e) {}
        try { tlb = Module._tlb_size_detection ? Module._tlb_size_detection() : null; } catch(_e) {}
        // Stride time
        const strideTimes = await this.measureStrideTimes();

        const features = {};

        // Memory features
        for (const [size, data] of Object.entries(memoryResults)) {
            if (typeof data.ratio === 'number') {
                features[`mem_ratio_${size}`] = data.ratio;
            }
        }

        // Calculation features
        features.float_precision = computeResults.float.result;
        features.integer_opt = computeResults.integer.result;
        features.vector_comp = computeResults.vector.result;
        features.branch_pred = computeResults.branch.result;
        features.simd_supported = simdBenchmark.supported;
        features.simd_speedup = simdBenchmark.speedup;
        features.simd_vector_ratio = simdBenchmark.vectorRatio;
        features.hardware_concurrency = workerProfile.hardwareConcurrency;
        features.worker_spawn_cap = workerProfile.spawned;
        features.worker_latency_median = workerProfile.medianLatency;
        features.worker_latency_mean = workerProfile.meanLatency;

        // Structure and stride
        features.l1_kb = l1;
        features.l2_kb = l2;
        features.l3_mb = l3;
        features.cache_line = cacheLine;
        features.tlb_entries = tlb;
        features.stride_ms = strideTimes;

        // Derived metrics
        const l1BandKeys = ['32KB','48KB','64KB'];
        const deepKeys = Object.keys(memoryResults).filter(k => parseInt(k) >= 256);
        const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
        const pickRatios = keys => avg(keys.map(k => memoryResults[k]?.ratio).filter(v=>typeof v==='number'));
        features.mem_ratio_l1_band = pickRatios(l1BandKeys);
        features.mem_ratio_deep = pickRatios(deepKeys);

        return {
            features,
            memoryResults,
            computeResults,
            structure: { l1_kb: l1, l2_kb: l2, l3_mb: l3, cache_line: cacheLine, tlb_entries: tlb },
            workerProfile,
            hash: this.calculateHash(features)
        };
    }

    // Simple hash function
    calculateHash(features) {
        const str = JSON.stringify(features);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    // CPU type inference (only based on WASM memory ratio, completely independent)
    analyzeCPUType(fingerprint) {
        // Extract ratio by size from memoryResults
        const ratios = {};
        const entries = Object.entries(fingerprint.memoryResults || {});
        for (const [k, v] of entries) {
            const m = /^(\d+)KB$/.exec(k);
            if (!m) continue;
            const size = parseInt(m[1], 10);
            const r = v && typeof v.ratio === 'number' ? v.ratio : NaN;
            if (!isNaN(r)) ratios[size] = r;
        }

        function avg(keys) {
            const arr = keys.map(k => ratios[k]).filter(x => typeof x === 'number');
            if (!arr.length) return NaN;
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        }

        const l1Band = avg([32, 48, 64]); // 32–64KB Approximate L1
        const deepBand = avg(Object.keys(ratios).map(Number).filter(x => x >= 256));
        const overall = avg(Object.keys(ratios).map(Number));

        // Thresholds can be overridden by calibration process, provide fallback defaults here
        const isAppleish = (x) => !isNaN(x) && x >= 0.5 && x < 1.6;
        const isIntellish = (x) => !isNaN(x) && x >= 1.6 && x <= 2.5;
        const isAMDish = (x) => !isNaN(x) && x > 2.5;

        let family = 'Unknown Architecture';
        let confidence = 0;
        const evidence = [];

        // Use L1 band as primary, deep band as auxiliary; then weight with vendor hints
        if (isAppleish(l1Band) && (isAppleish(overall) || isAppleish(deepBand))) {
            family = 'Apple Silicon';
            confidence = 80;
            evidence.push(`L1 ratio=${l1Band?.toFixed?.(2)}`);
        } else if (isIntellish(l1Band) || isIntellish(overall)) {
            family = 'Intel/High-Performance Desktop CPU';
            confidence = 65;
            evidence.push(`L1 ratio=${l1Band?.toFixed?.(2)}`);
        } else if (isAMDish(overall) || isAMDish(deepBand)) {
            family = 'AMD/Mainstream CPU';
            confidence = 60;
            evidence.push(`Deep ratio=${deepBand?.toFixed?.(2)}`);
        } else if (!isNaN(overall)) {
            family = 'Standard Computing Device';
            confidence = 50;
            evidence.push(`Overall Ratio=${overall?.toFixed?.(2)}`);
        } else {
            family = 'Execution too fast or insufficient data';
            confidence = 30;
        }

        confidence = Math.max(0, Math.min(95, confidence));
        return { family, confidence, evidence, l1Band, deepBand, overall };
    }

    // WASM subdivision classification (family/generation/tier), can use calibration.json (optional)
    async classifyWASM(fingerprint) {
        const cal = await this.loadCalibration();
        const f = fingerprint?.features || {};

        // Basic features
        const l1kb = +f.l1_kb || null;
        const l2kb = +f.l2_kb || null;
        const l3mb = +f.l3_mb || null;
        const l1Band = fingerprint?.features?.mem_ratio_l1_band;
        const deepBand = fingerprint?.features?.mem_ratio_deep;
        const overall = this._safeOverallRatio(fingerprint?.memoryResults);
        const logicalCores = typeof f.hardware_concurrency === 'number' && isFinite(f.hardware_concurrency)
            ? Math.round(f.hardware_concurrency)
            : null;
        const workerCap = typeof f.worker_spawn_cap === 'number' && isFinite(f.worker_spawn_cap)
            ? Math.round(f.worker_spawn_cap)
            : null;
        const simdSupported = !!f.simd_supported;

        // Fallback rules without calibration (simplified, awaiting sample fine-tuning)
        const evidence = [];
        let family = 'Unknown', generation = null, tier = null, confidence = 50;

        const isBetween = (x, a, b) => typeof x==='number' && x>=a && x<=b;

        // Rough family determination
        if (typeof l1Band === 'number' && l1Band < 1.6 && typeof deepBand === 'number' && deepBand < 1.6) {
            family = 'Apple'; evidence.push('Both L1/Deep ratio are low'); confidence += 10;
        } else if (typeof overall === 'number' && overall > 2.4) {
            family = 'AMD/ARM-like'; evidence.push('Overall Ratio on high side');
        } else if (typeof overall === 'number') {
            family = 'Intel/AMD-like'; evidence.push('Overall Ratio medium');
        }

        // Apple subdivision (based on structure)
        if (family === 'Apple') {
            if (isBetween(l1kb, 180, 200)) { generation = 'M4'; evidence.push(`L1≈${l1kb}KB`); confidence += 10; }
            else if (isBetween(l1kb, 120, 140)) { generation = 'M1/M2/M3'; evidence.push(`L1≈${l1kb}KB`); }

            if (l2kb && l2kb >= 12000) { tier = 'Pro/Max'; evidence.push(`L2≈${l2kb}KB`); confidence += 5; }
            else if (l2kb && l2kb >= 6000) { tier = 'Base/Pro'; evidence.push(`L2≈${l2kb}KB`); }

            // If L2 detection is conservative, use 4MB ratio as Pro/Max hint
            const mr = fingerprint?.memoryResults || {};
            const ratio4m = mr['4096KB']?.ratio;
            if (typeof ratio4m === 'number' && ratio4m >= 1.60) {
                if (!tier) tier = 'Pro/Max';
                evidence.push(`4MB Ratio=${ratio4m.toFixed(3)} indicates higher tier`);
                confidence += 5;
            }

            if (logicalCores && logicalCores >= 12) {
                if (!tier) tier = 'Pro/Max';
                confidence += 5;
                evidence.push(`Concurrent Cores≈${logicalCores} indicates high-end Apple chip`);
            }
        }

        // Intel/AMD subdivision (very rough, awaiting calibration sample refinement)
        if (family !== 'Apple') {
            if (l3mb && l3mb >= 24) { tier = 'Desktop-High'; evidence.push(`L3≈${l3mb}MB`); }
            else if (l3mb && l3mb >= 12) { tier = 'Desktop/Mobile-High'; evidence.push(`L3≈${l3mb}MB`); }
            if (typeof overall === 'number' && overall > 2.3) { generation = 'Zen/ARM-high'; }
            else if (typeof overall === 'number') { generation = 'Modern-Core'; }

            if (logicalCores && logicalCores >= 16) {
                tier = tier || 'Desktop-High';
                confidence += 5;
                evidence.push(`Concurrent Cores≈${logicalCores} indicates desktop flagship`);
            } else if (logicalCores && logicalCores >= 8 && !tier) {
                tier = 'Performance';
                evidence.push(`Concurrent Cores≈${logicalCores}`);
            }
        }

        // If calibration file exists, use calibration score to override family determination
        const bands = cal?.bands || null;
        if (bands && Object.keys(bands).length) {
            const scoreOf = (val, band, w) => {
                if (!band || typeof val !== 'number') return 0;
                const min = band.min ?? band.q25, max = band.max ?? band.q75, median = band.median ?? ((min+max)/2);
                const coreWidth = Math.max(1e-6, max - min);
                const tolerance = Math.max(coreWidth * 3, Math.abs(median) * 0.3, 0.15);
                const diff = Math.abs(val - median);
                const score = Math.max(0, 1 - (diff / tolerance));
                return score * w;
            };
            const scores = {};
            for (const key of Object.keys(bands)) {
                const b = bands[key];
                let s = 0;
                s += scoreOf(l1Band, b.l1, 0.5);
                s += scoreOf(deepBand, b.deep, 0.3);
                s += scoreOf(overall, b.overall, 0.2);
                scores[key] = s;
            }
            const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
            if (best && best[1] > 0.05) { // Have some matching degree
                const label = best[0];
                // Support subdivision labels：apple_m4_pro → family=apple, generation=m4, tier=pro
                const parts = label.split('_');
                family = parts[0].toUpperCase();
                generation = parts[1]?.toUpperCase?.() || generation;
                tier = parts.slice(2).join('_') || tier;
                evidence.push(`calibration match: ${label}`);
                confidence = Math.min(95, Math.max(confidence, Math.round(best[1]*100)));
            }
        }

        // Prefetcher efficiency bonus: infer using stride_ms (small/large)
        const stride = f.stride_ms || {};
        const t64 = typeof stride[64] === 'number' ? stride[64] : null;
        const t4k = typeof stride[4096] === 'number' ? stride[4096] : null;
        if (typeof deepBand === 'number' && t64 && t4k && t64 > 0 && t4k > 0) {
            const prefetchEff = t64 / t4k; // Consistent with page display
            if (deepBand >= 1.45 && deepBand <= 1.70 && prefetchEff >= 0.3 && prefetchEff <= 0.8) {
                confidence = Math.min(95, confidence + 10);
                evidence.push(`Deep ratio=${deepBand.toFixed(3)} & Prefetch efficiency=${prefetchEff.toFixed(2)} Matches M4 series characteristics`);
                if (family === 'Apple' && !tier) tier = 'Pro/Max';
            }
        }

        if (simdSupported) {
            confidence = Math.min(95, confidence + 3);
            evidence.push('WASM SIMD extension detected');
        }

        if (workerCap && workerCap >= 12) {
            evidence.push(`Worker concurrency limit≈${workerCap}`);
            if (!logicalCores && workerCap >= 12) {
                confidence += 2;
            }
        }

        return { family, generation, tier, confidence, evidence, l1kb, l2kb, l3mb, l1Band, deepBand, overall };
    }

    _safeOverallRatio(memoryResults) {
        if (!memoryResults) return null;
        const vals = Object.values(memoryResults).map(v => v?.ratio).filter(x => typeof x==='number');
        if (!vals.length) return null;
        return vals.reduce((a,b)=>a+b,0)/vals.length;
    }
}

// Global instance
window.wasmFingerprint = new WASMFingerprint();
