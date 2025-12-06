/**
 * Device signature database
 * Feature database and recognition algorithm for precise device model identification
 */

class DeviceSignatureDatabase {
    constructor() {
        this.deviceProfiles = this.initializeDeviceProfiles();
        this.learningData = new Map(); // For dynamic learning
        this.confidenceThresholds = {
            high: 85,
            medium: 70,
            low: 50
        };
        this.calibrationBands = undefined; // Deferred loading of calibration bands
    }

    /**
     * Initialize known device profiles
     */
    initializeDeviceProfiles() {
        return {
            // Apple device series
            apple: {
                "MacBook Air M1": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 4, e: 4, total: 8 },
                        l1CacheKB: { min: 120, max: 135 },
                        memoryRatio: { min: 0.7, max: 1.2 },
                        cacheProfile: "unified_memory",
                        performanceClass: "high_efficiency"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M1/i,
                            extensions: ["WEBGL_debug_renderer_info"],
                            canvasHashPattern: /^[a-f0-9]{8}$/
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "apple-gpu",
                            subgroupSize: { min: 32, max: 64 },
                            memoryBandwidth: { min: 50, max: 150 }
                        }
                    },
                    confidence: 95,
                    identifiers: ["M1", "Apple Silicon", "Unified memory"]
                },

                "MacBook Pro M1 Pro": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 6, e: 4, total: 10 }, // or 8P+2E
                        l1CacheKB: { min: 120, max: 135 },
                        memoryRatio: { min: 0.6, max: 1.1 },
                        cacheProfile: "unified_memory_pro",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M1 Pro/i,
                            extensions: ["WEBGL_debug_renderer_info"],
                            canvasHashPattern: /^[a-f0-9]{8}$/
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "apple-gpu",
                            subgroupSize: { min: 32, max: 64 },
                            memoryBandwidth: { min: 100, max: 250 }
                        }
                    },
                    confidence: 95,
                    identifiers: ["M1 Pro", "Apple Silicon", "Unified memory"]
                },

                "MacBook Air M2": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 4, e: 4, total: 8 },
                        l1CacheKB: { min: 120, max: 135 },
                        memoryRatio: { min: 0.7, max: 1.2 },
                        cacheProfile: "unified_memory_m2",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M2/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "apple-gpu",
                            subgroupSize: { min: 32, max: 64 },
                            memoryBandwidth: { min: 80, max: 200 }
                        }
                    },
                    confidence: 95,
                    identifiers: ["M2", "Apple Silicon", "Unified memory"]
                },
                "MacBook Air M3": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 4, e: 4, total: 8 },
                        l1CacheKB: { min: 120, max: 135 },
                        memoryRatio: { min: 0.7, max: 1.2 },
                        cacheProfile: "unified_memory_m3",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M3/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "apple-gpu",
                            subgroupSize: { min: 32, max: 64 },
                            memoryBandwidth: { min: 100, max: 250 }
                        }
                    },
                    confidence: 95,
                    identifiers: ["M3", "Apple Silicon", "Unified memory", "Hardware Ray Tracing"]
                },
                "MacBook Pro M2": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 6, e: 4, total: 10 }, // or 8P+4E for 12-core
                        l1CacheKB: { min: 120, max: 135 },
                        memoryRatio: { min: 0.7, max: 1.2 },
                        cacheProfile: "unified_memory_m2",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M2/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "apple-gpu",
                            subgroupSize: { min: 32, max: 64 },
                            memoryBandwidth: { min: 80, max: 200 }
                        }
                    },
                    confidence: 95,
                    identifiers: ["M2", "Apple Silicon", "Unified memory"]
                },

                "MacBook Air M4": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 4, e: 6, total: 10 },
                        l1CacheKB: { min: 180, max: 200 },
                        memoryRatio: { min: 0.9, max: 1.3 },
                        cacheProfile: "unified_memory_m4",
                        performanceClass: "ultra_high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M4/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "metal-3",
                            subgroupSize: { min: 4, max: 64 },
                            memoryBandwidth: { min: 200, max: 400 }
                        }
                    },
                    confidence: 98,
                    identifiers: ["M4", "Apple Silicon", "Unified memory", "Metal 3", "Enhanced AI"]
                },
                "MacBook Pro M4 Pro": {
                    cpu: {
                        architecture: "Apple Silicon",
                        cores: { p: 6, e: 6, total: 12 }, // or 8P+6E for 14-core
                        l1CacheKB: { min: 180, max: 200 },
                        memoryRatio: { min: 0.95, max: 1.25 },
                        cacheProfile: "unified_memory_m4",
                        performanceClass: "ultra_high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Apple",
                            renderer: /Apple M4 Pro|M4 Pro/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "apple",
                            architecture: "metal-3",
                            subgroupSize: { min: 4, max: 64 },
                            memoryBandwidth: { min: 300, max: 500 }
                        }
                    },
                    confidence: 98,
                    identifiers: ["M4 Pro", "Apple Silicon", "Unified memory", "Metal 3"]
                }
            },

            // Intel device series
            intel: {
                "Intel High-End Desktop": {
                    cpu: {
                        architecture: "Intel",
                        memoryRatio: { min: 1.5, max: 2.5 },
                        cacheProfile: "hierarchical_cache",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Intel",
                            renderer: /Intel.*Iris.*Xe/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "intel",
                            architecture: "intel-gpu",
                            memoryBandwidth: { min: 30, max: 80 }
                        }
                    },
                    confidence: 80,
                    identifiers: ["Intel", "Iris Xe", "Integrated Graphics"]
                },

                "Intel Gaming Laptop": {
                    cpu: {
                        architecture: "Intel",
                        memoryRatio: { min: 1.4, max: 2.3 },
                        cacheProfile: "hierarchical_cache",
                        performanceClass: "gaming"
                    },
                    gpu: {
                        webgl: {
                            vendor: "NVIDIA Corporation",
                            renderer: /NVIDIA.*RTX|GTX/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "nvidia",
                            memoryBandwidth: { min: 200, max: 800 }
                        }
                    },
                    confidence: 90,
                    identifiers: ["Intel", "NVIDIA", "Gaming"]
                }
            },

            // AMD device series
            amd: {
                "AMD Ryzen Desktop": {
                    cpu: {
                        architecture: "AMD",
                        memoryRatio: { min: 2.0, max: 3.5 },
                        cacheProfile: "amd_cache",
                        performanceClass: "high_performance"
                    },
                    gpu: {
                        webgl: {
                            vendor: "AMD",
                            renderer: /AMD.*Radeon/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        },
                        webgpu: {
                            vendor: "amd",
                            memoryBandwidth: { min: 150, max: 600 }
                        }
                    },
                    confidence: 85,
                    identifiers: ["AMD", "Ryzen", "Radeon"]
                }
            },

            // Mobile device series
            mobile: {
                "High-End Android": {
                    cpu: {
                        architecture: "ARM",
                        memoryRatio: { min: 2.5, max: 4.5 },
                        cacheProfile: "mobile_optimized",
                        performanceClass: "mobile_high"
                    },
                    gpu: {
                        webgl: {
                            vendor: "Qualcomm",
                            renderer: /Adreno/i,
                            extensions: ["WEBGL_debug_renderer_info"]
                        }
                    },
                    confidence: 75,
                    identifiers: ["ARM", "Adreno", "Mobile"]
                }
            }
        };
    }

    /**
     * Comprehensive device identification using all available features
     * @param {Object} comprehensiveFeatures - All collected features including cores, L1 cache, memory ratio, GPU, etc.
     * @returns {Object} Identification result with confidence and evidence
     */
    identifyDeviceComprehensive(comprehensiveFeatures) {
        const {
            cores = null,           // { p: number, e: number, total: number }
            l1CacheKB = null,       // L1 cache size in KB
            memoryRatio = null,      // Memory access ratio
            memoryRatioL1 = null,   // L1 band memory ratio
            memoryRatioDeep = null, // Deep memory ratio
            webglAnalysis = null,   // WebGL analysis result
            webgpuAnalysis = null,  // WebGPU analysis result
            computePerformance = null, // { float: number, integer: number, vector: number }
            deviceMemory = null,    // navigator.deviceMemory (if available)
            batteryStatus = null,   // { charging: boolean, level: number }
            performanceStability = null // Performance variance indicator
        } = comprehensiveFeatures;

        const candidates = [];
        const noiseFactors = this._assessNoiseFactors(comprehensiveFeatures);

        // Iterate through all device profiles
        for (const [brand, devices] of Object.entries(this.deviceProfiles)) {
            for (const [deviceName, profile] of Object.entries(devices)) {
                const score = this.calculateComprehensiveMatchScore(
                    brand, 
                    profile, 
                    comprehensiveFeatures,
                    noiseFactors
                );
                if (score.total > 40) { // Lower threshold for comprehensive matching
                    candidates.push({
                        brand,
                        deviceName,
                        profile,
                        score: score.total,
                        details: score.details,
                        contradictions: score.contradictions,
                        confidence: this.calculateConfidence(score.total, profile.confidence),
                        noiseAdjusted: score.noiseAdjusted
                    });
                }
            }
        }

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        // Return best match
        if (candidates.length > 0) {
            const best = candidates[0];
            return {
                deviceModel: `${best.brand} ${best.deviceName}`,
                confidence: best.confidence,
                noiseAdjustedConfidence: best.noiseAdjusted,
                evidence: this.generateEvidence(best),
                contradictions: best.contradictions || [],
                noiseFactors: noiseFactors,
                alternatives: candidates.slice(1, 3),
                matchDetails: best.details
            };
        }

        return {
            deviceModel: "Unknown Device",
            confidence: 0,
            evidence: ["Unable to match any known device configuration"],
            alternatives: [],
            matchDetails: {},
            noiseFactors: noiseFactors
        };
    }

    /**
     * Assess noise factors that might affect identification accuracy
     */
    _assessNoiseFactors(features) {
        const factors = {
            temperature: 'unknown',      // inferred from performance stability
            charging: features.batteryStatus?.charging ?? null,
            batteryLevel: features.batteryStatus?.level ?? null,
            systemLoad: 'unknown',      // inferred from performance variance
            performanceStability: features.performanceStability ?? null,
            browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        };

        // Infer temperature from performance stability
        if (features.performanceStability) {
            if (features.performanceStability.variance > 0.3) {
                factors.temperature = 'possibly_high'; // High variance suggests thermal throttling
            } else if (features.performanceStability.variance < 0.1) {
                factors.temperature = 'likely_normal';
            }
        }

        // Assess overall noise level
        let noiseLevel = 'low';
        if (factors.charging === false && factors.batteryLevel && factors.batteryLevel < 0.2) {
            noiseLevel = 'high'; // Low battery + not charging = likely performance throttling
        } else if (factors.performanceStability && factors.performanceStability.variance > 0.25) {
            noiseLevel = 'medium'; // High variance suggests instability
        }

        factors.noiseLevel = noiseLevel;
        return factors;
    }

    /**
     * Calculate comprehensive match score with noise consideration
     */
    calculateComprehensiveMatchScore(brand, profile, features, noiseFactors) {
        const scores = { 
            cores: 0, 
            l1Cache: 0, 
            memoryRatio: 0, 
            webgl: 0, 
            webgpu: 0,
            performance: 0,
            total: 0 
        };
        const details = { 
            cores: [], 
            l1Cache: [], 
            memoryRatio: [], 
            webgl: [], 
            webgpu: [],
            performance: []
        };
        const contradictions = [];

        const weights = {
            cores: 0.40,        // Most reliable
            l1Cache: 0.25,      // Very reliable for M1/M2/M3 vs M4
            memoryRatio: 0.15,  // Good indicator
            webgl: 0.10,        // Can be helpful
            webgpu: 0.05,       // Less reliable
            performance: 0.05    // Most affected by noise
        };

        // 1. Core configuration matching (highest weight)
        if (features.cores && profile.cpu.cores) {
            const expectedCores = profile.cpu.cores;
            const actualCores = features.cores;
            
            let coreScore = 0;
            if (actualCores.total === expectedCores.total) {
                coreScore += 20;
                details.cores.push(`Total cores match: ${actualCores.total}`);
            }
            
            if (actualCores.p === expectedCores.p && actualCores.e === expectedCores.e) {
                coreScore += 20;
                details.cores.push(`P/E core configuration exact match: ${actualCores.p}P+${actualCores.e}E`);
            } else if (Math.abs(actualCores.p - expectedCores.p) <= 1 && 
                       Math.abs(actualCores.e - expectedCores.e) <= 1) {
                coreScore += 15;
                details.cores.push(`P/E core configuration close match: ${actualCores.p}P+${actualCores.e}E (expected ${expectedCores.p}P+${expectedCores.e}E)`);
            } else {
                contradictions.push(`Core configuration mismatch: got ${actualCores.p}P+${actualCores.e}E, expected ${expectedCores.p}P+${expectedCores.e}E`);
            }
            
            scores.cores = coreScore;
        }

        // 2. L1 Cache matching (very reliable for distinguishing M1/M2/M3 vs M4)
        if (features.l1CacheKB && profile.cpu.l1CacheKB) {
            const expectedL1 = profile.cpu.l1CacheKB;
            const actualL1 = features.l1CacheKB;
            
            // Use tolerance: ±10KB for noise
            const tolerance = 10;
            if (actualL1 >= expectedL1.min - tolerance && actualL1 <= expectedL1.max + tolerance) {
                const distance = Math.min(
                    Math.abs(actualL1 - expectedL1.min),
                    Math.abs(actualL1 - expectedL1.max)
                );
                const score = distance <= 5 ? 25 : (25 - (distance - 5) * 2);
                scores.l1Cache = Math.max(0, score);
                details.l1Cache.push(`L1 cache match: ${actualL1}KB (expected ${expectedL1.min}-${expectedL1.max}KB)`);
            } else {
                contradictions.push(`L1 cache mismatch: got ${actualL1}KB, expected ${expectedL1.min}-${expectedL1.max}KB`);
            }
        }

        // 3. Memory ratio matching (with noise tolerance)
        if (features.memoryRatio && profile.cpu.memoryRatio) {
            const expectedRatio = profile.cpu.memoryRatio;
            const actualRatio = features.memoryRatio;
            
            // Increase tolerance if noise level is high, and for M4 series (which may have higher variance)
            const baseTolerance = 0.2;
            const noiseTolerance = noiseFactors.noiseLevel === 'high' ? 0.3 : 
                                  noiseFactors.noiseLevel === 'medium' ? 0.25 : baseTolerance;
            
            // For M4 series, allow more tolerance due to higher performance variance
            const isM4Series = profile.cpu.l1CacheKB && profile.cpu.l1CacheKB.min >= 180;
            const extendedTolerance = isM4Series ? noiseTolerance + 0.15 : noiseTolerance;
            
            if (actualRatio >= expectedRatio.min - extendedTolerance && 
                actualRatio <= expectedRatio.max + extendedTolerance) {
                const distance = Math.min(
                    Math.abs(actualRatio - expectedRatio.min),
                    Math.abs(actualRatio - expectedRatio.max)
                );
                const score = distance <= 0.1 ? 15 : (15 - distance * 10);
                scores.memoryRatio = Math.max(0, score);
                details.memoryRatio.push(`Memory ratio match: ${actualRatio.toFixed(3)} (expected ${expectedRatio.min}-${expectedRatio.max}, tolerance: ${extendedTolerance.toFixed(2)})`);
            } else {
                // Even if outside range, give partial score if close
                const distance = Math.min(
                    Math.abs(actualRatio - expectedRatio.min),
                    Math.abs(actualRatio - expectedRatio.max)
                );
                if (distance <= extendedTolerance + 0.1) {
                    // Close enough to give partial score
                    const partialScore = Math.max(0, 15 - (distance - extendedTolerance) * 20);
                    scores.memoryRatio = partialScore;
                    details.memoryRatio.push(`Memory ratio close match: ${actualRatio.toFixed(3)} (expected ${expectedRatio.min}-${expectedRatio.max}, distance: ${distance.toFixed(3)})`);
                } else {
                    // Too far, but don't add contradiction if other features match well
                    if (scores.cores < 30 && scores.l1Cache < 20) {
                        contradictions.push(`Memory ratio mismatch: got ${actualRatio.toFixed(3)}, expected ${expectedRatio.min}-${expectedRatio.max}`);
                    } else {
                        details.memoryRatio.push(`Memory ratio slightly out of range: ${actualRatio.toFixed(3)} (expected ${expectedRatio.min}-${expectedRatio.max}), but other features match well`);
                    }
                }
            }
        }

        // 4. WebGL matching
        if (features.webglAnalysis && profile.gpu.webgl) {
            const webglScore = this._matchWebGLFeatures(profile.gpu.webgl, features.webglAnalysis);
            scores.webgl = webglScore.score;
            details.webgl = webglScore.details;
            if (webglScore.contradictions) {
                contradictions.push(...webglScore.contradictions);
            }
        }

        // 5. WebGPU matching
        if (features.webgpuAnalysis && profile.gpu.webgpu) {
            const webgpuScore = this._matchWebGPUFeatures(profile.gpu.webgpu, features.webgpuAnalysis);
            scores.webgpu = webgpuScore.score;
            details.webgpu = webgpuScore.details;
            if (webgpuScore.contradictions) {
                contradictions.push(...webgpuScore.contradictions);
            }
        }

        // 6. Performance matching (low weight, high noise tolerance)
        if (features.computePerformance && noiseFactors.noiseLevel !== 'high') {
            // Only use performance if noise is low/medium
            // This is very approximate and mainly for distinguishing M1 vs M3
            const perfScore = this._matchPerformanceFeatures(profile, features.computePerformance);
            scores.performance = perfScore;
            if (perfScore > 0) {
                details.performance.push('Performance characteristics match');
            }
        }

        // Calculate weighted total
        let total = 0;
        total += scores.cores * weights.cores;
        total += scores.l1Cache * weights.l1Cache;
        total += scores.memoryRatio * weights.memoryRatio;
        total += scores.webgl * weights.webgl;
        total += scores.webgpu * weights.webgpu;
        total += scores.performance * weights.performance;

        // Apply contradiction penalty
        if (contradictions.length) {
            total -= Math.min(20, contradictions.length * 5);
        }

        // Apply noise penalty
        let noiseAdjusted = total;
        if (noiseFactors.noiseLevel === 'high') {
            noiseAdjusted = total * 0.85; // Reduce confidence by 15%
        } else if (noiseFactors.noiseLevel === 'medium') {
            noiseAdjusted = total * 0.92; // Reduce confidence by 8%
        }

        scores.total = Math.max(0, total);
        scores.noiseAdjusted = Math.max(0, noiseAdjusted);

        return { ...scores, details, contradictions };
    }

    /**
     * Match WebGL features
     */
    _matchWebGLFeatures(expected, actual) {
        const details = [];
        const contradictions = [];
        let score = 0;

        if (expected.vendor && actual.rawVendor) {
            const expectedVendor = this._normalizeVendorToken(expected.vendor);
            const actualVendor = this._normalizeVendorToken(actual.rawVendor);
            if (expectedVendor === actualVendor) {
                score += 5;
                details.push(`WebGL vendor match: ${actual.rawVendor}`);
            }
        }

        if (expected.renderer && actual.rawRenderer) {
            if (expected.renderer.test(actual.rawRenderer)) {
                score += 5;
                details.push(`WebGL renderer match: ${actual.rawRenderer}`);
            }
        }

        return { score, details, contradictions };
    }

    /**
     * Match WebGPU features
     */
    _matchWebGPUFeatures(expected, actual) {
        const details = [];
        const contradictions = [];
        let score = 0;

        const adapter = actual.rawAdapter || {};
        if (expected.vendor && adapter.vendor) {
            const expectedVendor = this._normalizeVendorToken(expected.vendor);
            const actualVendor = this._normalizeVendorToken(adapter.vendor);
            if (expectedVendor === actualVendor) {
                score += 3;
                details.push(`WebGPU vendor match: ${adapter.vendor}`);
            }
        }

        if (expected.architecture && adapter.architecture) {
            if (this._architectureMatches(adapter.architecture, expected.architecture)) {
                score += 2;
                details.push(`WebGPU architecture match: ${adapter.architecture}`);
            }
        }

        return { score, details, contradictions };
    }

    /**
     * Match performance features (very approximate, high noise tolerance)
     */
    _matchPerformanceFeatures(profile, computePerf) {
        // This is very rough and mainly for M1 vs M3 distinction
        // M3 is typically 20-30% faster than M1
        // But this is highly affected by temperature, load, etc.
        // So we use very wide tolerances
        
        // For now, just return a small score if performance seems reasonable
        // More sophisticated analysis would require calibration data
        if (computePerf.float && computePerf.integer) {
            // Basic sanity check: values should be in reasonable range
            if (computePerf.float > 0 && computePerf.float < 20 && 
                computePerf.integer > 0 && computePerf.integer < 10) {
                return 2; // Small contribution
            }
        }
        return 0;
    }

    /**
     * Identify device model
     */
    identifyDevice(cpuFeatures, webglAnalysis, webgpuAnalysis) {
        const candidates = [];

        // Iterate through all device profiles
        for (const [brand, devices] of Object.entries(this.deviceProfiles)) {
            for (const [deviceName, profile] of Object.entries(devices)) {
                const score = this.calculateMatchScore(brand, profile, cpuFeatures, webglAnalysis, webgpuAnalysis);
                if (score.total > 50) {
                    candidates.push({
                        brand,
                        deviceName,
                        profile,
                        score: score.total,
                        details: score.details,
                        contradictions: score.contradictions,
                        confidence: this.calculateConfidence(score.total, profile.confidence)
                    });
                }
            }
        }

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        // Return best match
        if (candidates.length > 0) {
            const best = candidates[0];
            const contradictory = (best.contradictions && best.contradictions.length > 0);
            const weak = best.score < 65; // Comprehensive score too low considered as weak match
            return {
                deviceModel: `${best.brand} ${best.deviceName}`,
                confidence: best.confidence,
                evidence: this.generateEvidence(best),
                contradictions: best.contradictions || [],
                needsMoreSamples: contradictory || weak,
                alternatives: candidates.slice(1, 3), // Return top 3 alternatives
                matchDetails: best.details
            };
        }

        return {
            deviceModel: "Unknown Device",
            confidence: 0,
            evidence: ["Unable to match any known device configuration"],
            alternatives: [],
            matchDetails: {}
        };
    }

    /**
     * Calculate match score
     */
    calculateMatchScore(brand, profile, cpuFeatures, webglAnalysis, webgpuAnalysis) {
        const scores = { cpu: 0, webgl: 0, webgpu: 0, total: 0 };
        const details = { cpu: [], webgl: [], webgpu: [] };
        const contradictions = [];

        // CPU Feature Match
        if (cpuFeatures) {
            // Architecture match
            if (cpuFeatures.model.includes(profile.cpu.architecture)) {
                scores.cpu += 30;
                details.cpu.push(`Architecture match: ${profile.cpu.architecture}`);
            } else if (cpuFeatures.model) {
                contradictions.push(`CPU architecture inconsistent: got=${cpuFeatures.model}, want=${profile.cpu.architecture}`);
            }

            const ratioValue = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
            const ratioContributions = [
                {
                    value: ratioValue(cpuFeatures.memRatio),
                    range: profile.cpu.memoryRatio || {},
                    bandType: 'overall',
                    maxScore: 25,
                    exactDetail: (val) => `Memory ratio match: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('Memory ratio', 'Memory ratio')
                },
                {
                    value: ratioValue(cpuFeatures.memRatioDeep),
                    range: profile.cpu.memoryRatioDeep || profile.cpu.memoryRatio || {},
                    bandType: 'deep',
                    maxScore: 18,
                    exactDetail: (val) => `Deep Memory ratio match: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('Memory ratio', 'Deep ratio')
                },
                {
                    value: ratioValue(cpuFeatures.memRatioL1),
                    range: profile.cpu.memoryRatioL1 || profile.cpu.memoryRatio || {},
                    bandType: 'l1',
                    maxScore: 12,
                    exactDetail: (val) => `L1Memory ratio match: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('Memory ratio', 'L1 ratio')
                }
            ];

            for (const entry of ratioContributions) {
                if (entry.value === null) continue;
                const { range, bandType, maxScore } = entry;
                const hasRange = typeof range.min === 'number' && typeof range.max === 'number';
                if (hasRange && entry.value >= range.min && entry.value <= range.max) {
                    scores.cpu += maxScore;
                    details.cpu.push(entry.exactDetail(entry.value));
                    continue;
                }

                const calMatch = this._matchCalibrationBand(brand, profile, entry.value, bandType, maxScore);
                if (calMatch?.match) {
                    scores.cpu += calMatch.score;
                    const detailText = calMatch.detail.includes('calibration interval')
                        ? entry.nearDetail(calMatch.detail)
                        : calMatch.detail;
                    details.cpu.push(detailText);
                } else {
                    const diff = this._distanceToRange(entry.value, range.min, range.max, calMatch?.deviation);
                    const baseScore = Math.max(0, maxScore * 0.7 - diff * maxScore * 0.5);
                    if (baseScore > 0) {
                        scores.cpu += baseScore;
                        details.cpu.push(entry.exactDetail(entry.value));
                    } else {
                        details.cpu.push(entry.exactDetail(entry.value));
                        if (diff > 0.6) {
                            contradictions.push(`CPU memory ratio deviation is large (${bandType}): diff=${diff.toFixed(2)}`);
                        }
                    }
                }
            }
        }

        // WebGL Feature Match
        if (webglAnalysis && profile.gpu.webgl) {
            const expectedVendor = this._normalizeVendorToken(profile.gpu.webgl.vendor);
            const analysisVendor = this._normalizeVendorToken(webglAnalysis.normalizedVendor || webglAnalysis.rawVendor);

            if (expectedVendor && analysisVendor && expectedVendor === analysisVendor) {
                scores.webgl += 20;
                details.webgl.push(`Vendor match: ${analysisVendor}`);
            } else if (webglAnalysis.rawVendor) {
                const raw = webglAnalysis.rawVendor.toLowerCase();
                const want = (profile.gpu.webgl.vendor || '').toLowerCase();
                if (want && raw.includes(want)) {
                    scores.webgl += 18;
                    details.webgl.push(`Vendor approximate match: ${webglAnalysis.rawVendor}`);
                } else {
                    contradictions.push(`WebGL vendor mismatch: got=${webglAnalysis.rawVendor}, want~=${profile.gpu.webgl.vendor}`);
                }
            }

            if (webglAnalysis.rawRenderer && profile.gpu.webgl.renderer) {
                if (profile.gpu.webgl.renderer.test(webglAnalysis.rawRenderer)) {
                    scores.webgl += 25;
                    details.webgl.push(`Renderer match: ${webglAnalysis.rawRenderer}`);
                }
            }

            if (profile.gpu.webgl.canvasHashPattern) {
                const pattern = profile.gpu.webgl.canvasHashPattern;
                const hashes = [];
                if (typeof webglAnalysis.canvasHash === 'string') hashes.push(webglAnalysis.canvasHash);
                if (webglAnalysis.canvasVariants && typeof webglAnalysis.canvasVariants === 'object') {
                    for (const value of Object.values(webglAnalysis.canvasVariants)) {
                        if (typeof value === 'string') hashes.push(value);
                    }
                }

                const matched = hashes.some(hash => typeof hash === 'string' && pattern.test(hash));
                if (matched) {
                    scores.webgl += 12;
                    details.webgl.push('Canvas fingerprint match');
                } else if (hashes.length) {
                    contradictions.push('Canvas fingerprint does not match expected pattern');
                }
            }

            if (webglAnalysis.confidence > 80) {
                scores.webgl += 10;
                details.webgl.push(`High confidence WebGL detection: ${webglAnalysis.confidence}%`);
            }
        }

        // WebGPU Feature Match
        if (webgpuAnalysis && profile.gpu.webgpu) {
            const expectedVendor = this._normalizeVendorToken(profile.gpu.webgpu.vendor);
            const adapter = webgpuAnalysis.rawAdapter || {};
            const actualVendor = this._normalizeVendorToken(webgpuAnalysis.normalizedVendor || adapter.vendor);

            if (expectedVendor && actualVendor && expectedVendor === actualVendor) {
                scores.webgpu += 25;
                details.webgpu.push(`WebGPUVendor match: ${actualVendor}`);
            } else if (adapter.vendor) {
                const raw = adapter.vendor.toLowerCase();
                const want = (profile.gpu.webgpu.vendor || '').toLowerCase();
                if (want && raw.includes(want)) {
                    scores.webgpu += 20;
                    details.webgpu.push(`WebGPUVendor approximate match: ${adapter.vendor}`);
                } else {
                    contradictions.push(`WebGPU vendor mismatch: got=${adapter.vendor}, want~=${profile.gpu.webgpu.vendor}`);
                }
            }

            if (adapter.architecture && profile.gpu.webgpu.architecture) {
                if (this._architectureMatches(adapter.architecture, profile.gpu.webgpu.architecture)) {
                    scores.webgpu += 20;
                    details.webgpu.push(`Architecture match: ${adapter.architecture}`);
                } else {
                    contradictions.push(`WebGPU architecture mismatch: got=${adapter.architecture}, want~=${profile.gpu.webgpu.architecture}`);
                }
            }

            if (webgpuAnalysis.confidence > 80) {
                scores.webgpu += 10;
                details.webgpu.push(`High confidence WebGPU detection: ${webgpuAnalysis.confidence}%`);
            }
        }

        // Calculate total score (weighted + contradiction penalty)
        const weights = { cpu: 0.45, webgl: 0.25, webgpu: 0.30 };
        let total = scores.cpu * weights.cpu + scores.webgl * weights.webgl + scores.webgpu * weights.webgpu;
        if (contradictions.length) total -= Math.min(15, contradictions.length * 5);
        scores.total = Math.max(0, total);

        return { ...scores, details, contradictions };
    }

    /**
     * Calculate confidence
     */
    calculateConfidence(matchScore, profileConfidence) {
        // Calculate final confidence based on match score and device profile confidence
        const scoreConfidence = Math.min(matchScore, 100);
        const finalConfidence = (scoreConfidence + profileConfidence) / 2;

        // Apply threshold adjustment
        if (finalConfidence >= this.confidenceThresholds.high) {
            return Math.min(finalConfidence, 95);
        }
        if (finalConfidence >= this.confidenceThresholds.medium) {
            return Math.max(60, finalConfidence);
        }
        return Math.max(40, finalConfidence * 0.85);
    }

    /**
     * Generate evidence list
     */
    generateEvidence(matchResult) {
        const evidence = [];

        evidence.push(`Device Type: ${matchResult.brand} ${matchResult.deviceName}`);
        evidence.push(`Overall Match Score: ${matchResult.score.toFixed(1)}/100`);

        // Add detailed match information
        if (matchResult.details.cpu.length > 0) {
            evidence.push("CPU Feature Match:");
            matchResult.details.cpu.forEach(detail => evidence.push(`   ${detail}`));
        }

        if (matchResult.details.webgl.length > 0) {
            evidence.push("WebGL Feature Match:");
            matchResult.details.webgl.forEach(detail => evidence.push(`   ${detail}`));
        }

        if (matchResult.details.webgpu.length > 0) {
            evidence.push("WebGPU Feature Match:");
            matchResult.details.webgpu.forEach(detail => evidence.push(`   ${detail}`));
        }

        return evidence;
    }

    _distanceToRange(value, min, max, fallback = null) {
        if (typeof value !== 'number' || !isFinite(value)) return 1;
        const hasMin = typeof min === 'number' && isFinite(min);
        const hasMax = typeof max === 'number' && isFinite(max);
        if (hasMin && hasMax) {
            if (value >= min && value <= max) return 0;
            if (value < min) return Math.abs(value - min);
            return Math.abs(value - max);
        }
        if (fallback !== null && typeof fallback === 'number') return Math.abs(fallback);
        if (hasMin) return Math.abs(value - min);
        if (hasMax) return Math.abs(value - max);
        return 1;
    }

    _matchCalibrationBand(brand, profile, value, bandType = 'overall', maxScore = 24) {
        const bands = this.getCalibrationBands();
        if (!bands || typeof value !== 'number' || !isFinite(value)) return null;

        const key = this._resolveCalibrationKey(brand, profile);
        const fam = bands?.[key];
        const band = fam?.[bandType] || fam?.overall || fam?.l1 || fam?.deep;
        if (!band) return null;

        const min = typeof band.min === 'number' ? band.min : band.q25;
        const max = typeof band.max === 'number' ? band.max : band.q75;
        const median = typeof band.median === 'number' ? band.median : ((min + max) / 2);
        if (typeof min !== 'number' || typeof max !== 'number') return null;

        const width = Math.max(1e-6, max - min);
        const tolerance = Math.max(width * 0.6, Math.abs(median) * 0.08, 0.1);
        const extendedMin = min - tolerance;
        const extendedMax = max + tolerance;

        const label = `${key}/${bandType}`;

        if (value >= min && value <= max) {
            return { match: true, score: maxScore, detail: `Memory ratio hits calibration band(${label})` };
        }

        if (value >= extendedMin && value <= extendedMax) {
            const deviation = Math.min(Math.abs(value - min), Math.abs(value - max));
            const normalized = Math.max(0, 1 - (deviation / Math.max(tolerance, 1e-6)));
            const floorScore = maxScore * 0.75;
            const score = floorScore + normalized * (maxScore - floorScore);
            return { match: true, score, detail: `Memory ratio close to calibration band(${label})`, deviation };
        }

        const deviation = Math.min(Math.abs(value - min), Math.abs(value - max));
        return { match: false, deviation };
    }

    getCalibrationBands() {
        try {
            if (typeof window !== 'undefined') {
                const fp = window.wasmFingerprint;
                if (fp && fp._calibration && fp._calibration.bands) {
                    this.calibrationBands = fp._calibration.bands;
                    return this.calibrationBands;
                }
                if (window.__WASM_CALIBRATION__ && window.__WASM_CALIBRATION__.bands) {
                    this.calibrationBands = window.__WASM_CALIBRATION__.bands;
                    return this.calibrationBands;
                }
            }
        } catch (_e) {}
        return this.calibrationBands || null;
    }

    _resolveCalibrationKey(brand, profile) {
        const lowerBrand = (brand || '').toLowerCase();
        if (['apple', 'intel', 'amd', 'nvidia'].includes(lowerBrand)) return lowerBrand;

        const arch = profile?.cpu?.architecture?.toLowerCase?.() || '';
        if (arch.includes('apple')) return 'apple';
        if (arch.includes('intel')) return 'intel';
        if (arch.includes('amd')) return 'amd';

        return lowerBrand || 'other';
    }

    _normalizeVendorToken(value) {
        if (!value) return '';
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        const lower = text.toLowerCase();
        if (lower.includes('apple') || lower.includes('metal')) return 'apple';
        if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx')) return 'nvidia';
        if (lower.includes('amd') || lower.includes('radeon') || lower.includes('rdna')) return 'amd';
        if (lower.includes('intel') || lower.includes('iris') || lower.includes('uhd')) return 'intel';
        if (lower.includes('qualcomm') || lower.includes('adreno')) return 'qualcomm';
        if (lower.includes('arm') || lower.includes('mali')) return 'arm';
        return lower.trim();
    }

    _architectureMatches(actual, expected) {
        if (!actual || !expected) return false;
        const clean = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const a = clean(actual);
        const e = clean(expected);
        if (!a || !e) return false;
        if (a.includes(e) || e.includes(a)) return true;

        const synonymGroups = [
            ['metal3', 'metal', 'applegpu'],
            ['applegpu', 'metal'],
            ['intelgpu', 'intel'],
            ['nvidiagpu', 'nvidia'],
            ['amdgpu', 'amd', 'rdna']
        ];
        for (const group of synonymGroups) {
            if (group.some(tag => a.includes(tag)) && group.some(tag => e.includes(tag))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Learn new device features
     */
    learnDeviceSignature(deviceName, cpuFeatures, webglAnalysis, webgpuAnalysis) {
        const signature = {
            deviceName,
            timestamp: Date.now(),
            features: {
                cpu: cpuFeatures,
                webgl: webglAnalysis,
                webgpu: webgpuAnalysis
            }
        };

        // Store to learning data
        if (!this.learningData.has(deviceName)) {
            this.learningData.set(deviceName, []);
        }
        this.learningData.get(deviceName).push(signature);

        // Limit storage quantity
        const signatures = this.learningData.get(deviceName);
        if (signatures.length > 10) {
            signatures.shift(); // Remove oldest record
        }
    }

    /**
     * Export learning data
     */
    exportLearningData() {
        const data = {};
        for (const [deviceName, signatures] of this.learningData.entries()) {
            data[deviceName] = signatures;
        }
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import learning data
     */
    importLearningData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            for (const [deviceName, signatures] of Object.entries(data)) {
                this.learningData.set(deviceName, signatures);
            }
            return true;
        } catch (error) {
            console.error('Failed to import learning data:', error);
            return false;
        }
    }

    /**
     * Generate device statistics report
     */
    generateDeviceStats() {
        const stats = {
            totalProfiles: 0,
            byBrand: {},
            learningData: {
                totalDevices: this.learningData.size,
                totalSignatures: 0
            }
        };

        // Count device profiles
        for (const [brand, devices] of Object.entries(this.deviceProfiles)) {
            stats.byBrand[brand] = Object.keys(devices).length;
            stats.totalProfiles += Object.keys(devices).length;
        }

        // Count learning data
        for (const signatures of this.learningData.values()) {
            stats.learningData.totalSignatures += signatures.length;
        }

        return stats;
    }

    /**
     * Search similar devices
     */
    findSimilarDevices(cpuFeatures, webglAnalysis, webgpuAnalysis, threshold = 60) {
        const similar = [];

        for (const [brand, devices] of Object.entries(this.deviceProfiles)) {
            for (const [deviceName, profile] of Object.entries(devices)) {
                const score = this.calculateMatchScore(brand, profile, cpuFeatures, webglAnalysis, webgpuAnalysis);
                if (score.total >= threshold) {
                    similar.push({
                        brand,
                        deviceName,
                        score: score.total,
                        confidence: this.calculateConfidence(score.total, profile.confidence)
                    });
                }
            }
        }

        return similar.sort((a, b) => b.score - a.score);
    }
}

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceSignatureDatabase;
} else if (typeof window !== 'undefined') {
    window.DeviceSignatureDatabase = DeviceSignatureDatabase;
}
