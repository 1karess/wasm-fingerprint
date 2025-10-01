/**
 * RealWorldDetector orchestrates layered detection that works under default browser settings.
 * It combines easily available signals (basic/device APIs), opportunistic advanced features
 * (SIMD/WebGPU/SharedArrayBuffer), and fallback heuristics (WASM + WebGL patterns) to derive
 * a practical device classification with confidence/evidence reporting.
 */

class RealWorldDetector {
    constructor(options = {}) {
        this.options = options;
        this.timeline = [];
        this._wasmHelper = null;
        this._deviceDatabase = null;
    }

    _stamp(stage, payload) {
        this.timeline.push({
            stage,
            timestamp: Date.now(),
            payload
        });
    }

    async detect() {
        const startedAt = performance.now();
        await this._ensurePrerequisites();

        const basic = this.collectBasicFeatures();
        this._stamp('basic', basic);

        const advanced = await this.collectAdvancedFeatures();
        this._stamp('advanced', advanced);

        const fallback = await this.collectFallbackFeatures();
        this._stamp('fallback', {
            wasm: fallback?.wasm?.summary,
            webgl: fallback?.webgl?.summary,
            errors: fallback.errors
        });

        const analysis = this.smartAnalysis({ basic, advanced, fallback });
        this._stamp('analysis', analysis);

        return {
            basic,
            advanced,
            fallback,
            analysis,
            timeline: this.timeline,
            durationMs: performance.now() - startedAt
        };
    }

    async _ensurePrerequisites() {
        if (!this._wasmHelper) {
            if (!window.wasmFingerprint || !(window.wasmFingerprint instanceof WASMFingerprint)) {
                window.wasmFingerprint = new WASMFingerprint();
            }
            this._wasmHelper = window.wasmFingerprint;
        }

        if (!this._deviceDatabase && typeof DeviceSignatureDatabase === 'function') {
            this._deviceDatabase = new DeviceSignatureDatabase();
        }
    }

    collectBasicFeatures() {
        const nav = typeof navigator === 'object' ? navigator : {};
        const screenInfo = typeof screen === 'object' ? screen : {};

        return {
            hardwareConcurrency: nav.hardwareConcurrency ?? null,
            deviceMemory: nav.deviceMemory ?? null,
            platform: nav.platform || null,
            userAgent: nav.userAgent || null,
            language: nav.language || null,
            timezoneOffsetMin: typeof Date === 'function' ? new Date().getTimezoneOffset() : null,
            screen: {
                width: screenInfo.width ?? null,
                height: screenInfo.height ?? null,
                colorDepth: screenInfo.colorDepth ?? null,
                pixelRatio: typeof window === 'object' ? window.devicePixelRatio ?? null : null
            }
        };
    }

    async collectAdvancedFeatures() {
        const result = {
            simd: null,
            webgpu: {
                available: !!(navigator && navigator.gpu),
                detected: false,
                analysis: null,
                error: null
            },
            sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
        };

        if (this._wasmHelper && typeof this._wasmHelper.detectSIMDSupport === 'function') {
            try {
                result.simd = await this._wasmHelper.detectSIMDSupport();
            } catch (err) {
                result.simd = null;
                result.simdError = err?.message || String(err);
            }
        }

        if (result.webgpu.available) {
            try {
                const webgpuFP = new WebGPUFingerprinter();
                const fingerprint = await webgpuFP.generateFingerprint();
                if (fingerprint) {
                    const analysis = webgpuFP.analyzeGPUModel(fingerprint);
                    result.webgpu.detected = true;
                    result.webgpu.fingerprint = fingerprint;
                    result.webgpu.analysis = analysis;
                }
                if (typeof webgpuFP.cleanup === 'function') {
                    webgpuFP.cleanup();
                }
            } catch (err) {
                result.webgpu.error = err?.message || String(err);
            }
        }

        return result;
    }

    async collectFallbackFeatures() {
        const output = {
            wasm: null,
            webgl: null,
            errors: {}
        };

        try {
            const fingerprint = await this._wasmHelper.generateFingerprint();
            const cpuType = this._wasmHelper.analyzeCPUType(fingerprint);
            let classification = null;
            if (typeof this._wasmHelper.classifyWASM === 'function') {
                try {
                    classification = await this._wasmHelper.classifyWASM(fingerprint);
                } catch (err) {
                    output.errors.classifyWASM = err?.message || String(err);
                }
            }

            output.wasm = {
                fingerprint,
                cpuType,
                classification,
                summary: {
                    cpuFamily: cpuType?.family || null,
                    confidence: cpuType?.confidence ?? null,
                    l1Band: cpuType?.l1Band ?? null,
                    deepBand: cpuType?.deepBand ?? null,
                    overall: cpuType?.overall ?? null
                }
            };
        } catch (err) {
            output.errors.wasm = err?.message || String(err);
        }

        try {
            const webglFP = new WebGLFingerprinter();
            const fingerprint = await webglFP.generateFingerprint();
            if (fingerprint) {
                const analysis = webglFP.analyzeGPUModel(fingerprint);
                output.webgl = {
                    fingerprint,
                    analysis,
                    summary: {
                        vendor: fingerprint.basic?.vendor || null,
                        renderer: fingerprint.basic?.renderer || null,
                        canvasHash: fingerprint.canvasHash || null,
                        blendHash: fingerprint.canvasVariants?.blend || null,
                        canvas2DHash: fingerprint.canvasVariants?.canvas2d || null,
                        analysisConfidence: analysis?.confidence ?? null,
                        analysisModel: analysis?.model || null
                    }
                };
            }
            if (typeof webglFP.cleanup === 'function') {
                webglFP.cleanup();
            }
        } catch (err) {
            output.errors.webgl = err?.message || String(err);
        }

        return output;
    }

    smartAnalysis(context) {
        const evidence = [];
        let method = 'basic-signals';
        let device = 'Modern computing device';
        let confidence = 35;
        let tier = 'baseline';

        const { basic, advanced, fallback } = context;
        const cpuFamily = fallback?.wasm?.cpuType?.family;
        const wasmConfidence = fallback?.wasm?.cpuType?.confidence ?? 0;

        let databaseResult = null;
        if (this._deviceDatabase && fallback?.wasm?.cpuType) {
            try {
                const cpuFeatures = {
                    model: fallback.wasm.cpuType.family || '未知架构',
                    confidence: fallback.wasm.cpuType.confidence ?? 0,
                    memRatio: fallback.wasm.cpuType.overall ?? null,
                    memRatioL1: fallback.wasm.cpuType.l1Band ?? null,
                    memRatioDeep: fallback.wasm.cpuType.deepBand ?? null
                };
                const webglAnalysis = fallback?.webgl?.analysis || null;
                const webgpuAnalysis = advanced?.webgpu?.analysis || null;
                databaseResult = this._deviceDatabase.identifyDevice(cpuFeatures, webglAnalysis, webgpuAnalysis);
            } catch (err) {
                this._stamp('database-error', err?.message || String(err));
            }
        }

        if (advanced?.webgpu?.analysis && advanced.webgpu.analysis.confidence >= 75) {
            const analysis = advanced.webgpu.analysis;
            device = analysis.model;
            confidence = Math.max(confidence, analysis.confidence);
            method = 'webgpu';
            tier = 'advanced';
            evidence.push(`WebGPU analysis matched ${analysis.model} (${analysis.confidence}%)`);
        } else if (fallback?.webgl?.analysis && fallback.webgl.analysis.confidence >= 70) {
            const analysis = fallback.webgl.analysis;
            device = analysis.model;
            confidence = Math.max(confidence, analysis.confidence);
            method = 'webgl+wasm';
            tier = 'intermediate';
            evidence.push(`WebGL renderer pattern → ${analysis.model}`);
        }

        if (cpuFamily) {
            evidence.push(`WASM memory pattern indicates ${cpuFamily}`);
            confidence = Math.max(confidence, wasmConfidence);
            if (method === 'basic-signals') {
                method = 'wasm-basic';
                device = cpuFamily;
            }
        }

        if (advanced?.simd === true) {
            evidence.push('WASM SIMD supported (desktop-class runtime)');
            confidence += 3;
        } else if (advanced?.simd === false) {
            evidence.push('WASM SIMD unavailable (falling back to scalar heuristics)');
        }

        if (advanced?.sharedArrayBuffer) {
            evidence.push('SharedArrayBuffer enabled → cross-origin isolated or modern Chromium');
        }

        if (fallback?.webgl?.summary?.canvasHash) {
            evidence.push(`Canvas fingerprint ${fallback.webgl.summary.canvasHash}`);
        }

        if (basic?.hardwareConcurrency) {
            evidence.push(`Navigator reports ${basic.hardwareConcurrency} logical cores`);
        }

        if (databaseResult && databaseResult.confidence > confidence) {
            device = databaseResult.deviceModel || device;
            confidence = Math.max(confidence, databaseResult.confidence);
            method = method === 'basic-signals' ? 'database' : `${method}+database`;
            tier = 'database-assisted';
            evidence.push(`Device DB match: ${databaseResult.deviceModel} (${databaseResult.confidence}%)`);
            if (Array.isArray(databaseResult.evidence)) {
                databaseResult.evidence.slice(0, 3).forEach(item => evidence.push(item));
            }
        }

        confidence = Math.max(30, Math.min(95, Math.round(confidence)));

        return {
            device,
            method,
            tier,
            confidence,
            evidence,
            cpuFamily,
            signals: {
                simd: advanced?.simd,
                webgpuAvailable: advanced?.webgpu?.available,
                webgpuAnalysis: advanced?.webgpu?.analysis || null,
                sharedArrayBuffer: advanced?.sharedArrayBuffer,
                canvasHashes: fallback?.webgl?.summary ? {
                    primary: fallback.webgl.summary.canvasHash,
                    blend: fallback.webgl.summary.blendHash,
                    canvas2d: fallback.webgl.summary.canvas2DHash
                } : null,
                databaseResult
            }
        };
    }
}

if (typeof window !== 'undefined') {
    window.RealWorldDetector = RealWorldDetector;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealWorldDetector;
}
