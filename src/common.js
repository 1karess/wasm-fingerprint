// 共享的WASM初始化和工具函数
// 共享的WASM初始化和工具函数
class WASMFingerprint {
    constructor() {
        this.wasmModule = null;
        this._calibration = null;
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

    // 高精度计时的内存测试函数
    timedTest(testFunc, ...args) {
        const startTime = performance.now();
        const result = testFunc(...args);
        const endTime = performance.now();
        return {
            result: result,
            time: endTime - startTime
        };
    }

    // 内存访问测试（自适应计时，去抖动）
    async runMemoryTests(sizes = [16, 32, 64, 256], baseIterations = 200, targetRsd = 0.07) {
        const Module = await this.initWASM();
        const results = {};

        function statsOf(arr) {
            if (!arr.length) return { mean: 0, std: 0, rsd: 1, median: 0 };
            const sorted = [...arr].sort((a, b) => a - b);
            const n = sorted.length;
            const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
            // 截尾均值（10%）
            const cut = Math.max(1, Math.floor(n * 0.1));
            const trimmed = sorted.slice(cut, Math.max(cut + 1, n - cut));
            const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            const variance = trimmed.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / trimmed.length;
            const std = Math.sqrt(variance);
            const rsd = mean > 0 ? std / mean : 1;
            return { mean, std, rsd, median, n };
        }

        async function measureOne(kind, size, iters) {
            const fn = kind === 'seq' ? Module._sequential_access_test.bind(Module)
                                      : Module._random_access_test.bind(Module);
            const samples = [];
            // 预热一次，丢弃
            try { fn(size, Math.max(1, Math.floor(iters / 4))); } catch(_e) {}
            // 采样5次
            for (let i = 0; i < 5; i++) {
                const t0 = performance.now();
                fn(size, iters);
                const t1 = performance.now();
                samples.push(t1 - t0);
            }
            return statsOf(samples);
        }

        for (const size of sizes) {
            let iters = baseIterations;
            let seqStats = await measureOne('seq', size, iters);
            let randStats = await measureOne('rand', size, iters);

            // 放大工作量直到稳定且可测（上限防爆）
            const maxIters = 20000;
            let guard = 0;
            while (guard++ < 8 && (
                seqStats.rsd > targetRsd || randStats.rsd > targetRsd ||
                seqStats.mean < 0.2 || randStats.mean < 0.2
            )) {
                iters = Math.min(maxIters, Math.floor(iters * 1.8));
                seqStats = await measureOne('seq', size, iters);
                randStats = await measureOne('rand', size, iters);
                if (iters >= maxIters) break;
            }

            const ratio = (randStats.median > 0.001 && seqStats.median > 0.001)
                ? (randStats.median / seqStats.median) : 'Too Fast';

            results[`${size}KB`] = {
                sequential: { time: seqStats.median, mean: seqStats.mean, rsd: seqStats.rsd, iterations: iters },
                random: { time: randStats.median, mean: randStats.mean, rsd: randStats.rsd, iterations: iters },
                ratio: ratio
            };
        }

        return results;
    }

    // 计算性能测试
    async runComputeTests() {
        const Module = await this.initWASM();

        return {
            float: this.timedTest(Module._float_precision_test.bind(Module), 10000),
            integer: this.timedTest(Module._integer_optimization_test.bind(Module), 10000),
            vector: this.timedTest(Module._vector_computation_test.bind(Module), 1000),
            branch: this.timedTest(Module._branch_prediction_test.bind(Module), 5000)
        };
    }

    // 加载校准阈值（如存在）
    async loadCalibration() {
        if (this._calibration) return this._calibration;
        try {
            // 浏览器环境尝试加载
            if (typeof fetch === 'function') {
                const res = await fetch('./docs/device-database/calibration.json', { cache: 'no-store' });
                if (res.ok) {
                    this._calibration = await res.json();
                    return this._calibration;
                }
            }
        } catch (_e) {}
        this._calibration = null;
        return null;
    }

    // 测量步长访问时间（毫秒，稳健统计）
    async measureStrideTimes(sizeKB = 512, strides = [64, 128, 256, 512, 4096], iterations = 200) {
        const Module = await this.initWASM();
        const out = {};
        const samplesPerStride = 3;

        for (const s of strides) {
            const times = [];
            // 预热
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

    // 生成设备指纹
    async generateFingerprint() {
        const Module = await this.initWASM();
        const memoryResults = await this.runMemoryTests();
        const computeResults = await this.runComputeTests();
        // 低层结构探测
        let l1 = null, l2 = null, l3 = null, cacheLine = null, tlb = null;
        try { l1 = Module._l1_cache_size_detection ? Module._l1_cache_size_detection(320) : null; } catch(_e) {}
        try { l2 = Module._l2_cache_size_detection ? Module._l2_cache_size_detection(20480) : null; } catch(_e) {}
        try { l3 = Module._l3_cache_size_detection ? Module._l3_cache_size_detection(64) : null; } catch(_e) {}
        try { cacheLine = Module._cache_line_size_detection ? Module._cache_line_size_detection() : null; } catch(_e) {}
        try { tlb = Module._tlb_size_detection ? Module._tlb_size_detection() : null; } catch(_e) {}
        // 步长时间
        const strideTimes = await this.measureStrideTimes();

        const features = {};

        // 内存特征
        for (const [size, data] of Object.entries(memoryResults)) {
            if (typeof data.ratio === 'number') {
                features[`mem_ratio_${size}`] = data.ratio;
            }
        }

        // 计算特征
        features.float_precision = computeResults.float.result;
        features.integer_opt = computeResults.integer.result;
        features.vector_comp = computeResults.vector.result;
        features.branch_pred = computeResults.branch.result;

        // 结构与步长
        features.l1_kb = l1;
        features.l2_kb = l2;
        features.l3_mb = l3;
        features.cache_line = cacheLine;
        features.tlb_entries = tlb;
        features.stride_ms = strideTimes;

        // 派生指标
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
            hash: this.calculateHash(features)
        };
    }

    // 简单哈希函数
    calculateHash(features) {
        const str = JSON.stringify(features);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(16);
    }

    // CPU类型推测（仅基于WASM内存比例，完全独立）
    analyzeCPUType(fingerprint) {
        // 从memoryResults分尺寸提取ratio
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

        const l1Band = avg([32, 48, 64]); // 32–64KB 近似L1
        const deepBand = avg(Object.keys(ratios).map(Number).filter(x => x >= 256));
        const overall = avg(Object.keys(ratios).map(Number));

        // 阈值可由校准流程覆盖，这里提供保底默认
        const isAppleish = (x) => !isNaN(x) && x >= 0.5 && x < 1.6;
        const isIntellish = (x) => !isNaN(x) && x >= 1.6 && x <= 2.5;
        const isAMDish = (x) => !isNaN(x) && x > 2.5;

        let family = '未知架构';
        let confidence = 0;
        const evidence = [];

        // 以L1段为主，深层段辅助；再用厂商提示加权
        if (isAppleish(l1Band) && (isAppleish(overall) || isAppleish(deepBand))) {
            family = 'Apple Silicon';
            confidence = 80;
            evidence.push(`L1比例=${l1Band?.toFixed?.(2)}`);
        } else if (isIntellish(l1Band) || isIntellish(overall)) {
            family = 'Intel/高性能桌面CPU';
            confidence = 65;
            evidence.push(`L1比例=${l1Band?.toFixed?.(2)}`);
        } else if (isAMDish(overall) || isAMDish(deepBand)) {
            family = 'AMD/主流CPU';
            confidence = 60;
            evidence.push(`深层比例=${deepBand?.toFixed?.(2)}`);
        } else if (!isNaN(overall)) {
            family = '标准计算设备';
            confidence = 50;
            evidence.push(`整体比例=${overall?.toFixed?.(2)}`);
        } else {
            family = '执行太快或数据不足';
            confidence = 30;
        }

        confidence = Math.max(0, Math.min(95, confidence));
        return { family, confidence, evidence, l1Band, deepBand, overall };
    }

    // WASM细分分类（家族/代际/档位），可使用 calibration.json（可选）
    async classifyWASM(fingerprint) {
        const cal = await this.loadCalibration();
        const f = fingerprint?.features || {};

        // 基础特征
        const l1kb = +f.l1_kb || null;
        const l2kb = +f.l2_kb || null;
        const l3mb = +f.l3_mb || null;
        const l1Band = fingerprint?.features?.mem_ratio_l1_band;
        const deepBand = fingerprint?.features?.mem_ratio_deep;
        const overall = this._safeOverallRatio(fingerprint?.memoryResults);

        // 无校准时的保底规则（简化，待样本微调）
        const evidence = [];
        let family = 'Unknown', generation = null, tier = null, confidence = 50;

        const isBetween = (x, a, b) => typeof x==='number' && x>=a && x<=b;

        // 粗判家族
        if (typeof l1Band === 'number' && l1Band < 1.6 && typeof deepBand === 'number' && deepBand < 1.6) {
            family = 'Apple'; evidence.push('L1/深层比例均低'); confidence += 10;
        } else if (typeof overall === 'number' && overall > 2.4) {
            family = 'AMD/ARM-like'; evidence.push('整体比例偏高');
        } else if (typeof overall === 'number') {
            family = 'Intel/AMD-like'; evidence.push('整体比例中等');
        }

        // Apple 细分（基于结构）
        if (family === 'Apple') {
            if (isBetween(l1kb, 180, 200)) { generation = 'M4'; evidence.push(`L1≈${l1kb}KB`); confidence += 10; }
            else if (isBetween(l1kb, 120, 140)) { generation = 'M1/M2/M3'; evidence.push(`L1≈${l1kb}KB`); }

            if (l2kb && l2kb >= 12000) { tier = 'Pro/Max'; evidence.push(`L2≈${l2kb}KB`); confidence += 5; }
            else if (l2kb && l2kb >= 6000) { tier = 'Base/Pro'; evidence.push(`L2≈${l2kb}KB`); }

            // 如果 L2 探测偏保守，使用 4MB 比例作为 Pro/Max 提示
            const mr = fingerprint?.memoryResults || {};
            const ratio4m = mr['4096KB']?.ratio;
            if (typeof ratio4m === 'number' && ratio4m >= 1.60) {
                if (!tier) tier = 'Pro/Max';
                evidence.push(`4MB比例=${ratio4m.toFixed(3)} 提示更高档位`);
                confidence += 5;
            }
        }

        // Intel/AMD 细分（非常粗，等待校准样本细化）
        if (family !== 'Apple') {
            if (l3mb && l3mb >= 24) { tier = 'Desktop-High'; evidence.push(`L3≈${l3mb}MB`); }
            else if (l3mb && l3mb >= 12) { tier = 'Desktop/Mobile-High'; evidence.push(`L3≈${l3mb}MB`); }
            if (typeof overall === 'number' && overall > 2.3) { generation = 'Zen/ARM-high'; }
            else if (typeof overall === 'number') { generation = 'Modern-Core'; }
        }

        // 若存在校准文件，使用校准分数覆盖家族判断
        const bands = cal?.bands || null;
        if (bands && Object.keys(bands).length) {
            const scoreOf = (val, band, w) => {
                if (!band || typeof val !== 'number') return 0;
                const min = band.min ?? band.q25, max = band.max ?? band.q75, median = band.median ?? ((min+max)/2);
                const width = Math.max(1e-6, (max - min) || Math.abs(median) || 1);
                const z = Math.abs(val - median) / width;
                return Math.max(0, (1 - Math.min(1, z))) * w;
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
            if (best && best[1] > 0.2) { // 有一定匹配度
                const label = best[0];
                // 支持细分标签：apple_m4_pro → family=apple, generation=m4, tier=pro
                const parts = label.split('_');
                family = parts[0].toUpperCase();
                generation = parts[1]?.toUpperCase?.() || generation;
                tier = parts.slice(2).join('_') || tier;
                evidence.push(`calibration match: ${label}`);
                confidence = Math.min(95, Math.max(confidence, Math.round(best[1]*100)));
            }
        }

        // 预取器效率加分：使用 stride_ms 推断（small/large）
        const stride = f.stride_ms || {};
        const t64 = typeof stride[64] === 'number' ? stride[64] : null;
        const t4k = typeof stride[4096] === 'number' ? stride[4096] : null;
        if (typeof deepBand === 'number' && t64 && t4k && t64 > 0 && t4k > 0) {
            const prefetchEff = t64 / t4k; // 与页面展示保持一致
            if (deepBand >= 1.45 && deepBand <= 1.70 && prefetchEff >= 0.3 && prefetchEff <= 0.8) {
                confidence = Math.min(95, confidence + 10);
                evidence.push(`深层比例=${deepBand.toFixed(3)} & 预取效率=${prefetchEff.toFixed(2)} 符合M4系特征`);
                if (family === 'Apple' && !tier) tier = 'Pro/Max';
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

// 全局实例
window.wasmFingerprint = new WASMFingerprint();
