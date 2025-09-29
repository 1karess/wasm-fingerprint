/**
 * WebGPU Device Fingerprinting Module
 * 基于WebGPU-SPY研究的GPU指纹识别系统
 */

class WebGPUFingerprinter {
    constructor() {
        this.adapter = null;
        this.device = null;
        this.features = {};
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // 检查WebGPU支持
            if (!navigator.gpu) {
                throw new Error('WebGPU不受支持');
            }

            // 请求适配器
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!this.adapter) {
                throw new Error('无法获取GPU适配器');
            }

            // 请求设备
            this.device = await this.adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {}
            });

            if (!this.device) {
                throw new Error('无法获取GPU设备');
            }

            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('WebGPU初始化失败:', error);
            return false;
        }
    }

    /**
     * 获取GPU适配器信息
     */
    getAdapterInfo() {
        if (!this.adapter) return {};

        // 2025年新API: 直接访问adapter.info
        const info = this.adapter.info || {};

        return {
            vendor: info.vendor || '',
            architecture: info.architecture || '',
            device: info.device || '',
            description: info.description || '',
            subgroupMinSize: info.subgroupMinSize || 0,
            subgroupMaxSize: info.subgroupMaxSize || 0
        };
    }

    /**
     * 获取GPU特性和限制
     */
    getDeviceCapabilities() {
        if (!this.device) return {};

        const features = Array.from(this.device.features || []);
        const limits = this.device.limits || {};

        return {
            features,
            limits: {
                maxTextureSize: limits.maxTextureDimension1D || 0,
                maxBufferSize: limits.maxBufferSize || 0,
                maxStorageBufferSize: limits.maxStorageBufferBindingSize || 0,
                maxComputeWorkgroupSizeX: limits.maxComputeWorkgroupSizeX || 0,
                maxComputeWorkgroupSizeY: limits.maxComputeWorkgroupSizeY || 0,
                maxComputeWorkgroupSizeZ: limits.maxComputeWorkgroupSizeZ || 0,
                maxComputeInvocationsPerWorkgroup: limits.maxComputeInvocationsPerWorkgroup || 0,
                maxComputeWorkgroupsPerDimension: limits.maxComputeWorkgroupsPerDimension || 0
            }
        };
    }

    /**
     * GPU时序攻击测试 (基于WebGPU-SPY)
     * 通过GPU硬件资源构建高精度计时器
     */
    async performTimingAttacks() {
        if (!this.device) return {};

        const results = {};

        try {
            // 1. GPU计时器精度测试
            const timerResolution = await this.measureGPUTimerResolution();
            results.timerResolution = timerResolution;

            // 2. 内存带宽测试
            const memoryBandwidth = await this.measureMemoryBandwidth();
            results.memoryBandwidth = memoryBandwidth;

            // 3. 计算延迟测试
            const computeLatency = await this.measureComputeLatency();
            results.computeLatency = computeLatency;

            // 4. 缓存行为分析
            const cacheProfile = await this.analyzeCacheBehavior();
            results.cacheProfile = cacheProfile;

        } catch (error) {
            console.error('GPU时序攻击失败:', error);
        }

        return results;
    }

    /**
     * 测量GPU计时器分辨率
     */
    async measureGPUTimerResolution() {
        try {
            // 创建简单的空操作计算着色器
            const shaderModule = this.device.createShaderModule({
                code: `
                    @compute @workgroup_size(1)
                    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                        // no-op
                    }
                `
            });

            const computePipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main'
                }
            });

            const sampleCount = 40;
            const warmupCount = 5;
            const samples = [];

            for (let i = 0; i < sampleCount; i++) {
                const commandEncoder = this.device.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);
                passEncoder.dispatchWorkgroups(1);
                passEncoder.end();

                const start = performance.now();
                this.device.queue.submit([commandEncoder.finish()]);
                await this.device.queue.onSubmittedWorkDone();
                const end = performance.now();

                if (i >= warmupCount) {
                    samples.push(end - start);
                }
            }

            if (!samples.length) {
                throw new Error('计时器采样不足');
            }

            // 使用截尾平均降低异常值影响
            const sorted = [...samples].sort((a, b) => a - b);
            const trim = Math.max(1, Math.floor(sorted.length * 0.1));
            const trimmed = sorted.slice(trim, sorted.length - trim);
            const usable = trimmed.length ? trimmed : sorted;
            const sum = usable.reduce((acc, val) => acc + val, 0);
            const average = sum / usable.length;
            const variance = usable.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / usable.length;
            const stdDev = Math.sqrt(Math.max(variance, 0));

            return {
                average,
                minimum: sorted[0],
                maximum: sorted[sorted.length - 1],
                standardDeviation: stdDev,
                measurements: samples
            };

        } catch (error) {
            console.error('GPU计时器测试失败:', error);
            return null;
        }
    }

    /**
     * 测量内存带宽
     */
    async measureMemoryBandwidth() {
        try {
            // Apple Silicon统一内存架构需要不同的测试方法
            // 使用计算着色器进行大量内存访问来测量真实带宽

            const maxAlloc = this.device.limits?.maxBufferSize || (512 * 1024 * 1024);
            const targetSize = 512 * 1024 * 1024; // 512MB 目标，若硬件不支持会自动降级
            const bufferSize = Math.min(targetSize, maxAlloc - (maxAlloc % 4));
            const workgroupSize = 256;
            const numWorkgroups = Math.floor(bufferSize / 4 / workgroupSize); // 4 bytes per float

            // 创建计算着色器测试内存带宽
            const computeShaderSource = `
                @group(0) @binding(0) var<storage, read_write> data: array<f32>;

                @compute @workgroup_size(${workgroupSize})
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let index = global_id.x;
                    if (index >= arrayLength(&data)) { return; }

                    // 内存密集操作：大量顺序和随机访问
                    var sum: f32 = 0.0;
                    let stride = 1024u; // 4KB步长，避开L1缓存

                    // 多轮内存访问增加带宽压力
                    for (var i = 0u; i < 80u; i++) {
                        let read_index = (index + i * stride) % arrayLength(&data);
                        sum += data[read_index];
                    }
                    data[index] = sum * 0.001; // 写回操作
                }
            `;

            const computeShader = this.device.createShaderModule({
                code: computeShaderSource
            });

            const storageBuffer = this.device.createBuffer({
                size: bufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });

            // 初始化数据
            const initData = new Float32Array(bufferSize / 4);
            for (let i = 0; i < initData.length; i++) {
                initData[i] = Math.random();
            }
            this.device.queue.writeBuffer(storageBuffer, 0, initData);

            const computePipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: computeShader,
                    entryPoint: 'main'
                }
            });

            const bindGroup = this.device.createBindGroup({
                layout: computePipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: { buffer: storageBuffer }
                }]
            });

            const bandwidthResults = [];
            const iterations = 8;

            for (let i = 0; i < iterations; i++) {
                const commandEncoder = this.device.createCommandEncoder();
                const computePass = commandEncoder.beginComputePass();

                computePass.setPipeline(computePipeline);
                computePass.setBindGroup(0, bindGroup);

                computePass.dispatchWorkgroups(numWorkgroups);
                computePass.end();

                const start = performance.now();
                this.device.queue.submit([commandEncoder.finish()]);
                await this.device.queue.onSubmittedWorkDone();
                const end = performance.now();

                const executionTime = end - start;
                if (executionTime > 1.0) { // 至少1ms才可信
                    // 估算带宽：每个工作项读取80次(4字节)，写入1次(4字节)
                    const bytesAccessed = numWorkgroups * workgroupSize * (80 * 4 + 1 * 4);
                    const bandwidthBytesPerSec = bytesAccessed / (executionTime / 1000);
                    bandwidthResults.push({
                        gbPerSec: bandwidthBytesPerSec / (1024 ** 3),
                        mbPerSec: bandwidthBytesPerSec / (1024 ** 2)
                    });
                }
            }

            storageBuffer.destroy();

            if (bandwidthResults.length > 0) {
                const avgGB = bandwidthResults.reduce((a, b) => a + b.gbPerSec, 0) / bandwidthResults.length;
                const avgMB = bandwidthResults.reduce((a, b) => a + b.mbPerSec, 0) / bandwidthResults.length;

                return {
                    bandwidthGB: avgGB,
                    bandwidthMB: avgMB,
                    method: 'compute_shader_memory_intensive',
                    bufferSize,
                    workgroups: numWorkgroups,
                    validTests: bandwidthResults.length,
                    rawResults: bandwidthResults
                };
            }

            throw new Error('内存带宽测试失败');

        } catch (error) {
            console.error('内存带宽测试失败:', error);
            return null;
        }
    }

    /**
     * 测量计算延迟
     */
    async measureComputeLatency() {
        try {
            // 创建足够大的输出缓冲区确保结果被实际使用
            const bufferSize = 4 * 1024 * 1024; // 4MB
            const numElements = bufferSize / 4;

            const outputBuffer = this.device.createBuffer({
                size: bufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });

            const readBuffer = this.device.createBuffer({
                size: bufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            // 不同复杂度的计算着色器 - 修复工作负载平衡问题
            const testCases = [
                {
                    name: 'simple',
                    workgroupSize: 256,
                    iterations: 8000, // 基础迭代次数
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var result: f32 = f32(index);
                            // 简单计算：基础算术运算
                            for (var i = 0u; i < 500u; i++) {
                                result = result + f32(i) * 0.001;
                                result = result * 0.999 + 0.001; // 简单乘法和加法
                            }
                            output[index] = result;
                        }
                    `
                },
                {
                    name: 'math_intensive',
                    workgroupSize: 256,
                    iterations: 8000, // 相同迭代次数但内部计算更复杂
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var result = f32(index) * 0.001;
                            // 数学密集：大量三角函数和平方根（比简单计算多得多的操作）
                            for (var i = 0u; i < 1500u; i++) { // 3倍的循环次数
                                let fi = f32(i) * 0.01;
                                result = sin(result + fi) * cos(result - fi); // 复杂三角运算
                                result = sqrt(abs(result)) + pow(result, 1.1); // 平方根和幂运算
                                result = log(abs(result) + 1.0) + exp(result * 0.01); // 对数和指数
                                result = result * 0.99 + 0.01; // 防止溢出
                            }
                            output[index] = result;
                        }
                    `
                },
                {
                    name: 'memory_intensive',
                    workgroupSize: 256,
                    iterations: 8000, // 相同迭代次数
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var sum: f32 = 0.0;
                            let stride = 1024u; // 大步长制造缓存未命中

                            // 内存密集：比简单计算更多的内存访问
                            for (var i = 0u; i < 800u; i++) { // 比简单计算更多的循环
                                let read_idx = (index + i * stride) % arrayLength(&output);
                                let write_idx = (index + i * 64u) % arrayLength(&output);
                                sum += output[read_idx]; // 读取操作
                                output[write_idx] = sum * 0.001; // 写入操作
                                // 额外的内存访问增加负载
                                let extra_idx = (index + i * 128u) % arrayLength(&output);
                                sum += output[extra_idx] * 0.1;
                            }
                            output[index] = sum;
                        }
                    `
                }
            ];

            const results = {};

            for (const testCase of testCases) {
                try {
                    const shaderModule = this.device.createShaderModule({
                        code: testCase.shader
                    });

                    const computePipeline = this.device.createComputePipeline({
                        layout: 'auto',
                        compute: {
                            module: shaderModule,
                            entryPoint: 'main'
                        }
                    });

                    // 为内存密集型测试创建缓冲区
                    let buffer = null;
                    let bindGroup = null;
                    if (testCase.name === 'memory_intensive') {
                        buffer = this.device.createBuffer({
                            size: 1024 * 4, // 1K floats
                            usage: GPUBufferUsage.STORAGE
                        });

                        bindGroup = this.device.createBindGroup({
                            layout: computePipeline.getBindGroupLayout(0),
                            entries: [{
                                binding: 0,
                                resource: { buffer }
                            }]
                        });
                    }

                    // 测量执行时间
                    const start = performance.now();

                    const commandEncoder = this.device.createCommandEncoder();
                    const passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(computePipeline);
                    if (bindGroup) passEncoder.setBindGroup(0, bindGroup);
                    passEncoder.dispatchWorkgroups(16); // 1024 threads
                    passEncoder.end();

                    this.device.queue.submit([commandEncoder.finish()]);
                    await this.device.queue.onSubmittedWorkDone();

                    const end = performance.now();

                    results[testCase.name] = end - start;

                    // 清理
                    if (buffer) buffer.destroy();

                } catch (error) {
                    console.error(`计算测试 ${testCase.name} 失败:`, error);
                    results[testCase.name] = null;
                }
            }

            return results;

        } catch (error) {
            console.error('计算延迟测试失败:', error);
            return null;
        }
    }

    /**
     * 分析GPU缓存行为
     */
    async analyzeCacheBehavior() {
        try {
            // 不同访问模式的内存测试
            const accessPatterns = [
                { name: 'sequential', stride: 1 },
                { name: 'stride_4', stride: 4 },
                { name: 'stride_16', stride: 16 },
                { name: 'random', stride: -1 }
            ];

            const results = {};

            for (const pattern of accessPatterns) {
                const shader = pattern.stride === -1 ? `
                    @group(0) @binding(0) var<storage, read_write> data: array<f32>;

                    @compute @workgroup_size(64)
                    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                        let index = global_id.x;
                        if (index < arrayLength(&data)) {
                            // 伪随机访问
                            let random_index = (index * 17u + 31u) % arrayLength(&data);
                            data[random_index] = data[random_index] + 1.0;
                        }
                    }
                ` : `
                    @group(0) @binding(0) var<storage, read_write> data: array<f32>;

                    @compute @workgroup_size(64)
                    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                        let index = global_id.x * ${pattern.stride}u;
                        if (index < arrayLength(&data)) {
                            data[index] = data[index] + 1.0;
                        }
                    }
                `;

                try {
                    const shaderModule = this.device.createShaderModule({ code: shader });
                    const computePipeline = this.device.createComputePipeline({
                        layout: 'auto',
                        compute: { module: shaderModule, entryPoint: 'main' }
                    });

                    const buffer = this.device.createBuffer({
                        size: 64 * 1024 * 4, // 64K floats = 256KB
                        usage: GPUBufferUsage.STORAGE
                    });

                    const bindGroup = this.device.createBindGroup({
                        layout: computePipeline.getBindGroupLayout(0),
                        entries: [{ binding: 0, resource: { buffer } }]
                    });

                    const start = performance.now();

                    const commandEncoder = this.device.createCommandEncoder();
                    const passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(computePipeline);
                    passEncoder.setBindGroup(0, bindGroup);
                    passEncoder.dispatchWorkgroups(32); // 2048 threads
                    passEncoder.end();

                    this.device.queue.submit([commandEncoder.finish()]);
                    await this.device.queue.onSubmittedWorkDone();

                    const end = performance.now();

                    results[pattern.name] = end - start;
                    buffer.destroy();

                } catch (error) {
                    console.error(`缓存测试 ${pattern.name} 失败:`, error);
                    results[pattern.name] = null;
                }
            }

            // 计算缓存效率指标
            if (results.sequential && results.random) {
                results.cacheEfficiency = results.random / results.sequential;
            }

            return results;

        } catch (error) {
            console.error('缓存行为分析失败:', error);
            return null;
        }
    }

    /**
     * 执行完整的WebGPU指纹识别
     */
    async generateFingerprint() {
        if (!await this.initialize()) {
            return null;
        }

        const fingerprint = {
            adapter: this.getAdapterInfo(),
            capabilities: this.getDeviceCapabilities(),
            timing: await this.performTimingAttacks(),
            timestamp: Date.now()
        };

        // 生成综合特征哈希
        const signature = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < signature.length; i++) {
            hash = ((hash << 5) - hash + signature.charCodeAt(i)) & 0xffffffff;
        }
        fingerprint.signatureHash = hash.toString(16);

        return fingerprint;
    }

    /**
     * 分析GPU型号（基于WebGPU特征）
     */
    analyzeGPUModel(fingerprint) {
        if (!fingerprint) return { model: '未知', confidence: 0, evidence: [] };

        const evidence = [];
        let confidence = 0;
        let model = '未知GPU';

        const adapter = fingerprint.adapter || {};
        const timing = fingerprint.timing || {};

        // 基于适配器信息分析
        if (adapter.vendor) {
            evidence.push(`GPU厂商: ${adapter.vendor}`);

            if (adapter.vendor.toLowerCase().includes('apple')) {
                model = 'Apple GPU';
                confidence = 85;

                if (adapter.architecture && adapter.architecture.includes('apple-gpu')) {
                    confidence = 90;
                    evidence.push('Apple GPU架构确认');
                }

                // 基于subgroup size分析具体型号
                if (adapter.subgroupMaxSize >= 32) {
                    if (adapter.architecture && adapter.architecture.includes('metal-3')) {
                        model = 'Apple M4 Pro GPU';
                        confidence = 95;
                    } else {
                        model = 'Apple M1/M2/M3 GPU';
                        confidence = 92;
                    }
                }
            }
            else if (adapter.vendor.toLowerCase().includes('intel')) {
                model = 'Intel GPU';
                confidence = 80;
                evidence.push('Intel GPU特征');
            }
            else if (adapter.vendor.toLowerCase().includes('nvidia')) {
                model = 'NVIDIA GPU';
                confidence = 80;
                evidence.push('NVIDIA GPU特征');
            }
            else if (adapter.vendor.toLowerCase().includes('amd')) {
                model = 'AMD GPU';
                confidence = 80;
                evidence.push('AMD GPU特征');
            }
        }

        // 基于性能特征分析
        if (timing.memoryBandwidth) {
            const { bandwidthGB, bandwidthMB } = timing.memoryBandwidth;
            const hasGB = typeof bandwidthGB === 'number' && isFinite(bandwidthGB);
            const hasMB = typeof bandwidthMB === 'number' && isFinite(bandwidthMB);
            if (hasGB) {
                evidence.push(`内存带宽: ${bandwidthGB.toFixed(2)} GB/s`);
            } else if (hasMB) {
                evidence.push(`内存带宽: ${(bandwidthMB / 1024).toFixed(2)} GB/s (估算)`);
            }

            const bandwidthScore = hasGB ? bandwidthGB : (hasMB ? bandwidthMB / 1024 : null);
            if (typeof bandwidthScore === 'number' && bandwidthScore > 100) {
                evidence.push('高性能GPU特征');
                confidence = Math.min(confidence + 10, 95);
            } else if (typeof bandwidthScore === 'number' && bandwidthScore < 50) {
                evidence.push('集成显卡特征');
                if (model === '未知GPU') {
                    model = '集成显卡';
                    confidence = 70;
                }
            }
        }

        // 基于计算延迟分析
        if (timing.computeLatency) {
            const { simple, math_intensive } = timing.computeLatency;

            if (simple && math_intensive) {
                const ratio = math_intensive / simple;
                evidence.push(`计算复杂度比例: ${ratio.toFixed(2)}`);

                if (ratio < 5) {
                    evidence.push('强大的并行计算能力');
                    confidence = Math.min(confidence + 5, 95);
                }
            }
        }

        // 基于缓存效率分析
        if (timing.cacheProfile && timing.cacheProfile.cacheEfficiency) {
            const efficiency = timing.cacheProfile.cacheEfficiency;
            evidence.push(`缓存效率: ${efficiency.toFixed(2)}`);

            if (efficiency < 1.5) {
                evidence.push('优秀的缓存架构');
                confidence = Math.min(confidence + 5, 95);
            }
        }

        return {
            model,
            confidence,
            evidence,
            rawAdapter: adapter
        };
    }

    /**
     * 运行计算性能测试
     */
    async runComputePerformanceTest() {
        if (!this.device) {
            throw new Error('WebGPU设备未初始化');
        }

        try {
            const results = {};

            // 简单计算测试
            const simpleComputeShader = `
                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let index = global_id.x;
                    // 简单计算测试
                }
            `;

            const shaderModule = this.device.createShaderModule({
                code: simpleComputeShader
            });

            const computePipeline = this.device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: shaderModule,
                    entryPoint: 'main'
                }
            });

            // 创建命令编码器
            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();

            const start = performance.now();
            this.device.queue.submit([commandEncoder.finish()]);
            await this.device.queue.onSubmittedWorkDone();
            const end = performance.now();

            results.simpleCompute = end - start;
            results.status = 'success';

            return results;

        } catch (error) {
            console.warn('WebGPU计算性能测试失败:', error);
            return {
                status: 'failed',
                error: error.message,
                simpleCompute: 0
            };
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.device) {
            this.device.destroy();
        }
        this.device = null;
        this.adapter = null;
        this.isInitialized = false;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGPUFingerprinter;
} else if (typeof window !== 'undefined') {
    window.WebGPUFingerprinter = WebGPUFingerprinter;
}
