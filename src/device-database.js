/**
 * 设备签名数据库
 * 用于精确识别设备型号的特征数据库和识别算法
 */

class DeviceSignatureDatabase {
    constructor() {
        this.deviceProfiles = this.initializeDeviceProfiles();
        this.learningData = new Map(); // 用于动态学习
        this.confidenceThresholds = {
            high: 85,
            medium: 70,
            low: 50
        };
        this.calibrationBands = undefined; // 延迟加载的校准区间
    }

    /**
     * 初始化已知设备配置文件
     */
    initializeDeviceProfiles() {
        return {
            // Apple 设备系列
            apple: {
                "MacBook Air M1": {
                    cpu: {
                        architecture: "Apple Silicon",
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
                    identifiers: ["M1", "Apple Silicon", "统一内存"]
                },

                "MacBook Pro M1 Pro": {
                    cpu: {
                        architecture: "Apple Silicon",
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
                    identifiers: ["M1 Pro", "Apple Silicon", "统一内存"]
                },

                "MacBook Pro M2": {
                    cpu: {
                        architecture: "Apple Silicon",
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
                    identifiers: ["M2", "Apple Silicon", "统一内存"]
                },

                "MacBook Pro M4 Pro": {
                    cpu: {
                        architecture: "Apple Silicon",
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
                    identifiers: ["M4 Pro", "Apple Silicon", "统一内存", "Metal 3"]
                }
            },

            // Intel 设备系列
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
                    identifiers: ["Intel", "Iris Xe", "集成显卡"]
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

            // AMD 设备系列
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

            // 移动设备系列
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
     * 识别设备型号
     */
    identifyDevice(cpuFeatures, webglAnalysis, webgpuAnalysis) {
        const candidates = [];

        // 遍历所有设备配置文件
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

        // 按分数排序
        candidates.sort((a, b) => b.score - a.score);

        // 返回最佳匹配
        if (candidates.length > 0) {
            const best = candidates[0];
            const contradictory = (best.contradictions && best.contradictions.length > 0);
            const weak = best.score < 65; // 综合分过低视为弱匹配
            return {
                deviceModel: `${best.brand} ${best.deviceName}`,
                confidence: best.confidence,
                evidence: this.generateEvidence(best),
                contradictions: best.contradictions || [],
                needsMoreSamples: contradictory || weak,
                alternatives: candidates.slice(1, 3), // 返回前3个备选
                matchDetails: best.details
            };
        }

        return {
            deviceModel: "未知设备",
            confidence: 0,
            evidence: ["无法匹配任何已知设备配置"],
            alternatives: [],
            matchDetails: {}
        };
    }

    /**
     * 计算匹配分数
     */
    calculateMatchScore(brand, profile, cpuFeatures, webglAnalysis, webgpuAnalysis) {
        const scores = { cpu: 0, webgl: 0, webgpu: 0, total: 0 };
        const details = { cpu: [], webgl: [], webgpu: [] };
        const contradictions = [];

        // CPU特征匹配
        if (cpuFeatures) {
            // 架构匹配
            if (cpuFeatures.model.includes(profile.cpu.architecture)) {
                scores.cpu += 30;
                details.cpu.push(`架构匹配: ${profile.cpu.architecture}`);
            } else if (cpuFeatures.model) {
                contradictions.push(`CPU架构不一致: got=${cpuFeatures.model}, want=${profile.cpu.architecture}`);
            }

            const ratioValue = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
            const ratioContributions = [
                {
                    value: ratioValue(cpuFeatures.memRatio),
                    range: profile.cpu.memoryRatio || {},
                    bandType: 'overall',
                    maxScore: 25,
                    exactDetail: (val) => `内存比例匹配: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('内存比例', '内存比例')
                },
                {
                    value: ratioValue(cpuFeatures.memRatioDeep),
                    range: profile.cpu.memoryRatioDeep || profile.cpu.memoryRatio || {},
                    bandType: 'deep',
                    maxScore: 18,
                    exactDetail: (val) => `深层内存比例匹配: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('内存比例', '深层比例')
                },
                {
                    value: ratioValue(cpuFeatures.memRatioL1),
                    range: profile.cpu.memoryRatioL1 || profile.cpu.memoryRatio || {},
                    bandType: 'l1',
                    maxScore: 12,
                    exactDetail: (val) => `L1内存比例匹配: ${val.toFixed(3)}`,
                    nearDetail: (detail) => detail.replace('内存比例', 'L1比例')
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
                    const detailText = calMatch.detail.includes('校准区间')
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
                            contradictions.push(`CPU内存比例偏差较大 (${bandType}): diff=${diff.toFixed(2)}`);
                        }
                    }
                }
            }
        }

        // WebGL特征匹配
        if (webglAnalysis && profile.gpu.webgl) {
            const expectedVendor = this._normalizeVendorToken(profile.gpu.webgl.vendor);
            const analysisVendor = this._normalizeVendorToken(webglAnalysis.normalizedVendor || webglAnalysis.rawVendor);

            if (expectedVendor && analysisVendor && expectedVendor === analysisVendor) {
                scores.webgl += 20;
                details.webgl.push(`厂商匹配: ${analysisVendor}`);
            } else if (webglAnalysis.rawVendor) {
                const raw = webglAnalysis.rawVendor.toLowerCase();
                const want = (profile.gpu.webgl.vendor || '').toLowerCase();
                if (want && raw.includes(want)) {
                    scores.webgl += 18;
                    details.webgl.push(`厂商近似匹配: ${webglAnalysis.rawVendor}`);
                } else {
                    contradictions.push(`WebGL厂商不一致: got=${webglAnalysis.rawVendor}, want~=${profile.gpu.webgl.vendor}`);
                }
            }

            if (webglAnalysis.rawRenderer && profile.gpu.webgl.renderer) {
                if (profile.gpu.webgl.renderer.test(webglAnalysis.rawRenderer)) {
                    scores.webgl += 25;
                    details.webgl.push(`渲染器匹配: ${webglAnalysis.rawRenderer}`);
                }
            }

            if (webglAnalysis.confidence > 80) {
                scores.webgl += 10;
                details.webgl.push(`高置信度WebGL检测: ${webglAnalysis.confidence}%`);
            }
        }

        // WebGPU特征匹配
        if (webgpuAnalysis && profile.gpu.webgpu) {
            const expectedVendor = this._normalizeVendorToken(profile.gpu.webgpu.vendor);
            const adapter = webgpuAnalysis.rawAdapter || {};
            const actualVendor = this._normalizeVendorToken(webgpuAnalysis.normalizedVendor || adapter.vendor);

            if (expectedVendor && actualVendor && expectedVendor === actualVendor) {
                scores.webgpu += 25;
                details.webgpu.push(`WebGPU厂商匹配: ${actualVendor}`);
            } else if (adapter.vendor) {
                const raw = adapter.vendor.toLowerCase();
                const want = (profile.gpu.webgpu.vendor || '').toLowerCase();
                if (want && raw.includes(want)) {
                    scores.webgpu += 20;
                    details.webgpu.push(`WebGPU厂商近似匹配: ${adapter.vendor}`);
                } else {
                    contradictions.push(`WebGPU厂商不一致: got=${adapter.vendor}, want~=${profile.gpu.webgpu.vendor}`);
                }
            }

            if (adapter.architecture && profile.gpu.webgpu.architecture) {
                if (this._architectureMatches(adapter.architecture, profile.gpu.webgpu.architecture)) {
                    scores.webgpu += 20;
                    details.webgpu.push(`架构匹配: ${adapter.architecture}`);
                } else {
                    contradictions.push(`WebGPU架构不一致: got=${adapter.architecture}, want~=${profile.gpu.webgpu.architecture}`);
                }
            }

            if (webgpuAnalysis.confidence > 80) {
                scores.webgpu += 10;
                details.webgpu.push(`高置信度WebGPU检测: ${webgpuAnalysis.confidence}%`);
            }
        }

        // 计算总分 (加权+矛盾惩罚)
        const weights = { cpu: 0.45, webgl: 0.25, webgpu: 0.30 };
        let total = scores.cpu * weights.cpu + scores.webgl * weights.webgl + scores.webgpu * weights.webgpu;
        if (contradictions.length) total -= Math.min(15, contradictions.length * 5);
        scores.total = Math.max(0, total);

        return { ...scores, details, contradictions };
    }

    /**
     * 计算置信度
     */
    calculateConfidence(matchScore, profileConfidence) {
        // 基于匹配分数和设备配置文件置信度计算最终置信度
        const scoreConfidence = Math.min(matchScore, 100);
        const finalConfidence = (scoreConfidence + profileConfidence) / 2;

        // 应用阈值调整
        if (finalConfidence >= this.confidenceThresholds.high) {
            return Math.min(finalConfidence, 95);
        }
        if (finalConfidence >= this.confidenceThresholds.medium) {
            return Math.max(60, finalConfidence);
        }
        return Math.max(40, finalConfidence * 0.85);
    }

    /**
     * 生成证据列表
     */
    generateEvidence(matchResult) {
        const evidence = [];

        evidence.push(`设备类型: ${matchResult.brand} ${matchResult.deviceName}`);
        evidence.push(`总体匹配分数: ${matchResult.score.toFixed(1)}/100`);

        // 添加详细匹配信息
        if (matchResult.details.cpu.length > 0) {
            evidence.push("CPU特征匹配:");
            matchResult.details.cpu.forEach(detail => evidence.push(`  • ${detail}`));
        }

        if (matchResult.details.webgl.length > 0) {
            evidence.push("WebGL特征匹配:");
            matchResult.details.webgl.forEach(detail => evidence.push(`  • ${detail}`));
        }

        if (matchResult.details.webgpu.length > 0) {
            evidence.push("WebGPU特征匹配:");
            matchResult.details.webgpu.forEach(detail => evidence.push(`  • ${detail}`));
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
            return { match: true, score: maxScore, detail: `内存比例命中校准区间(${label})` };
        }

        if (value >= extendedMin && value <= extendedMax) {
            const deviation = Math.min(Math.abs(value - min), Math.abs(value - max));
            const normalized = Math.max(0, 1 - (deviation / Math.max(tolerance, 1e-6)));
            const floorScore = maxScore * 0.75;
            const score = floorScore + normalized * (maxScore - floorScore);
            return { match: true, score, detail: `内存比例接近校准区间(${label})`, deviation };
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
     * 学习新设备特征
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

        // 存储到学习数据中
        if (!this.learningData.has(deviceName)) {
            this.learningData.set(deviceName, []);
        }
        this.learningData.get(deviceName).push(signature);

        // 限制存储数量
        const signatures = this.learningData.get(deviceName);
        if (signatures.length > 10) {
            signatures.shift(); // 移除最旧的记录
        }
    }

    /**
     * 导出学习数据
     */
    exportLearningData() {
        const data = {};
        for (const [deviceName, signatures] of this.learningData.entries()) {
            data[deviceName] = signatures;
        }
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导入学习数据
     */
    importLearningData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            for (const [deviceName, signatures] of Object.entries(data)) {
                this.learningData.set(deviceName, signatures);
            }
            return true;
        } catch (error) {
            console.error('导入学习数据失败:', error);
            return false;
        }
    }

    /**
     * 生成设备统计报告
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

        // 统计设备配置文件
        for (const [brand, devices] of Object.entries(this.deviceProfiles)) {
            stats.byBrand[brand] = Object.keys(devices).length;
            stats.totalProfiles += Object.keys(devices).length;
        }

        // 统计学习数据
        for (const signatures of this.learningData.values()) {
            stats.learningData.totalSignatures += signatures.length;
        }

        return stats;
    }

    /**
     * 搜索相似设备
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

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceSignatureDatabase;
} else if (typeof window !== 'undefined') {
    window.DeviceSignatureDatabase = DeviceSignatureDatabase;
}
