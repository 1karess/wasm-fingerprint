/**
 * WebGPU Device Fingerprinting Module
 * GPU fingerprinting system based on WebGPU-SPY research
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
            // Check WebGPU support
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported');
            }

            // Request adapter
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!this.adapter) {
                throw new Error('Unable to acquire GPU adapter');
            }

            // Request device
            this.device = await this.adapter.requestDevice({
                requiredFeatures: [],
                requiredLimits: {}
            });

            if (!this.device) {
                throw new Error('Unable to acquire GPU device');
            }

            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('WebGPU initialization failed:', error);
            return false;
        }
    }

    /**
     * Get GPU adapter information
     */
    getAdapterInfo() {
        if (!this.adapter) return {};

        // 2025 new API: direct access to adapter.info
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
     * Get GPU features and limits
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
     * GPU timing attack test (based on WebGPU-SPY)
     * Build high-precision timer through GPU hardware resources
     */
    async performTimingAttacks() {
        if (!this.device) return {};

        const results = {};

        try {
            // 1. GPU timer precision test
            const timerResolution = await this.measureGPUTimerResolution();
            results.timerResolution = timerResolution;

            // 2. Memory bandwidth test
            const memoryBandwidth = await this.measureMemoryBandwidth();
            results.memoryBandwidth = memoryBandwidth;

            // 3. Computation latency test
            const computeLatency = await this.measureComputeLatency();
            results.computeLatency = computeLatency;

            // 4. Cache behavior analysis
            const cacheProfile = await this.analyzeCacheBehavior();
            results.cacheProfile = cacheProfile;

        } catch (error) {
            console.error('GPU timing attack failed:', error);
        }

        return results;
    }

    /**
     * Measure GPU timer resolution
     */
    async measureGPUTimerResolution() {
        try {
            // Create simple no-op compute shader
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
                throw new Error('Insufficient timer samples');
            }

            // Use truncated mean to reduce outlier impact
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
            console.error('GPU timer test failed:', error);
            return null;
        }
    }

    /**
     * Measure memory bandwidth
     */
    async measureMemoryBandwidth() {
        try {
            // Apple Silicon unified memory architecture requires different testing approach
            // Use compute shader for large memory access to measure real bandwidth

            const maxAlloc = this.device.limits?.maxBufferSize || (512 * 1024 * 1024);
            const targetSize = 512 * 1024 * 1024; // 512MB target, will automatically downgrade if hardware does not support
            const bufferSize = Math.min(targetSize, maxAlloc - (maxAlloc % 4));
            const workgroupSize = 256;
            const numWorkgroups = Math.floor(bufferSize / 4 / workgroupSize); // 4 bytes per float

            // Create compute shader to test memory bandwidth
            const computeShaderSource = `
                @group(0) @binding(0) var<storage, read_write> data: array<f32>;

                @compute @workgroup_size(${workgroupSize})
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let index = global_id.x;
                    if (index >= arrayLength(&data)) { return; }

                    // Memory intensive operations: large amount of sequential and random access
                    var sum: f32 = 0.0;
                    let stride = 1024u; // 4KB stride, avoid L1 cache

                    // Multiple rounds of memory access to increase bandwidth pressure
                    for (var i = 0u; i < 80u; i++) {
                        let read_index = (index + i * stride) % arrayLength(&data);
                        sum += data[read_index];
                    }
                    data[index] = sum * 0.001; // Write-back operation
                }
            `;

            const computeShader = this.device.createShaderModule({
                code: computeShaderSource
            });

            const storageBuffer = this.device.createBuffer({
                size: bufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });

            // Initialize data
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
                if (executionTime > 1.0) { // At least 1ms is reliable
                    // Estimate bandwidth: each work item reads 80 times (4 bytes), writes 1 time (4 bytes)
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

            throw new Error('Memory bandwidth test failed');

        } catch (error) {
            console.error('Memory bandwidth test failed:', error);
            return null;
        }
    }

    /**
     * Measure computation latency
     */
    async measureComputeLatency() {
        try {
            // Create large enough output buffer to ensure results are actually used
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

            // Compute shaders of different complexity - fix workload balance issue
            const testCases = [
                {
                    name: 'simple',
                    workgroupSize: 256,
                    iterations: 8000, // Base iteration count
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var result: f32 = f32(index);
                            // Simple computation: basic arithmetic operations
                            for (var i = 0u; i < 500u; i++) {
                                result = result + f32(i) * 0.001;
                                result = result * 0.999 + 0.001; // Simple multiplication and addition
                            }
                            output[index] = result;
                        }
                    `
                },
                {
                    name: 'math_intensive',
                    workgroupSize: 256,
                    iterations: 8000, // Same iteration count but more complex internal computation
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var result = f32(index) * 0.001;
                            // Math intensive: large amount of trigonometric and square root operations (much more than simple computation)
                            for (var i = 0u; i < 1500u; i++) { // 3x loop count
                                let fi = f32(i) * 0.01;
                                result = sin(result + fi) * cos(result - fi); // Complex trigonometric operations
                                result = sqrt(abs(result)) + pow(result, 1.1); // Square root and power operations
                                result = log(abs(result) + 1.0) + exp(result * 0.01); // Logarithm and exponential
                                result = result * 0.99 + 0.01; // Prevent overflow
                            }
                            output[index] = result;
                        }
                    `
                },
                {
                    name: 'memory_intensive',
                    workgroupSize: 256,
                    iterations: 8000, // Same iteration count
                    shader: `
                        @group(0) @binding(0) var<storage, read_write> output: array<f32>;

                        @compute @workgroup_size(256)
                        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                            let index = global_id.x;
                            if (index >= arrayLength(&output)) { return; }

                            var sum: f32 = 0.0;
                            let stride = 1024u; // Large stride to create cache misses

                            // Memory intensive: more memory access than simple computation
                            for (var i = 0u; i < 800u; i++) { // More loops than simple computation
                                let read_idx = (index + i * stride) % arrayLength(&output);
                                let write_idx = (index + i * 64u) % arrayLength(&output);
                                sum += output[read_idx]; // Read operation
                                output[write_idx] = sum * 0.001; // Write operation
                                // Additional memory access increases load
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

                    // Create buffer for memory-intensive test
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

                    // Measure execution time
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

                    // Cleanup
                    if (buffer) buffer.destroy();

                } catch (error) {
                    console.error(`Computation test ${testCase.name} failed:`, error);
                    results[testCase.name] = null;
                }
            }

            return results;

        } catch (error) {
            console.error('Computation latency test failed:', error);
            return null;
        }
    }

    /**
     * Analyze GPU cache behavior
     */
    async analyzeCacheBehavior() {
        try {
            // Memory tests with different access patterns
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
                            // Pseudo-random access
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
                    console.error(`Cache test ${pattern.name} failed:`, error);
                    results[pattern.name] = null;
                }
            }

            // Calculate cache efficiency metric
            if (results.sequential && results.random) {
                results.cacheEfficiency = results.random / results.sequential;
            }

            return results;

        } catch (error) {
            console.error('Cache behavior analysis failed:', error);
            return null;
        }
    }

    /**
     * Execute complete WebGPU fingerprinting
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

        // Generate comprehensive feature hash
        const signature = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < signature.length; i++) {
            hash = ((hash << 5) - hash + signature.charCodeAt(i)) & 0xffffffff;
        }
        fingerprint.signatureHash = hash.toString(16);

        return fingerprint;
    }

    /**
     * Analyze GPU model (based on WebGPU features)
     */
    analyzeGPUModel(fingerprint) {
        if (!fingerprint) return { model: 'Unknown', confidence: 0, evidence: [] };

        const evidence = [];
        let confidence = 0;
        let model = 'UnknownGPU';

        const adapter = fingerprint.adapter || {};
        const normalizedVendor = this._normalizeAdapterVendor(adapter);
        const timing = fingerprint.timing || {};

        // Analysis based on adapter information
        if (adapter.vendor) {
            evidence.push(`GPU Vendor: ${adapter.vendor}`);

            if (normalizedVendor === 'apple') {
                model = 'Apple GPU';
                confidence = 85;

                if (adapter.architecture && adapter.architecture.includes('apple-gpu')) {
                    confidence = 90;
                    evidence.push('Apple GPU architecture confirmed');
                }

                // Analyze specific model based on subgroup size
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
            else if (normalizedVendor === 'intel') {
                model = 'Intel GPU';
                confidence = 80;
                evidence.push('Intel GPU characteristics');
            }
            else if (normalizedVendor === 'nvidia') {
                model = 'NVIDIA GPU';
                confidence = 80;
                evidence.push('NVIDIA GPU characteristics');
            }
            else if (normalizedVendor === 'amd') {
                model = 'AMD GPU';
                confidence = 80;
                evidence.push('AMD GPU characteristics');
            }
        }

        // Analysis based on performance features
        if (timing.memoryBandwidth) {
            const { bandwidthGB, bandwidthMB } = timing.memoryBandwidth;
            const hasGB = typeof bandwidthGB === 'number' && isFinite(bandwidthGB);
            const hasMB = typeof bandwidthMB === 'number' && isFinite(bandwidthMB);
            if (hasGB) {
                evidence.push(`Memory Bandwidth: ${bandwidthGB.toFixed(2)} GB/s`);
            } else if (hasMB) {
                evidence.push(`Memory Bandwidth: ${(bandwidthMB / 1024).toFixed(2)} GB/s (estimated)`);
            }

            const bandwidthScore = hasGB ? bandwidthGB : (hasMB ? bandwidthMB / 1024 : null);
            if (typeof bandwidthScore === 'number' && bandwidthScore > 100) {
                evidence.push('High-performance GPU features');
                confidence = Math.min(confidence + 10, 95);
            } else if (typeof bandwidthScore === 'number' && bandwidthScore < 50) {
                evidence.push('Integrated graphics characteristics');
                if (model === 'UnknownGPU') {
                    model = 'Integrated Graphics';
                    confidence = 70;
                }
            }
        }

        // Analysis based on computation latency
        if (timing.computeLatency) {
            const { simple, math_intensive } = timing.computeLatency;

            if (simple && math_intensive) {
                const ratio = math_intensive / simple;
                evidence.push(`Computation complexity ratio: ${ratio.toFixed(2)}`);

                if (ratio < 5) {
                    evidence.push('Strong parallel computing capability');
                    confidence = Math.min(confidence + 5, 95);
                }
            }
        }

        // Analysis based on cache efficiency
        if (timing.cacheProfile && timing.cacheProfile.cacheEfficiency) {
            const efficiency = timing.cacheProfile.cacheEfficiency;
            evidence.push(`Cache Efficiency: ${efficiency.toFixed(2)}`);

            if (efficiency < 1.5) {
                evidence.push('Excellent cache architecture');
                confidence = Math.min(confidence + 5, 95);
            }
        }

        const analysis = {
            model,
            confidence,
            evidence,
            rawAdapter: adapter,
            normalizedVendor
        };

        fingerprint.normalizedVendor = normalizedVendor;

        return analysis;
    }

    _normalizeAdapterVendor(adapter) {
        const vendor = (adapter?.vendor || '').toLowerCase();
        const arch = (adapter?.architecture || '').toLowerCase();
        const desc = (adapter?.description || '').toLowerCase();
        const combined = `${vendor} ${arch} ${desc}`;

        if (combined.includes('apple') || combined.includes('metal')) return 'apple';
        if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('rtx')) return 'nvidia';
        if (combined.includes('amd') || combined.includes('radeon') || combined.includes('rdna')) return 'amd';
        if (combined.includes('intel')) return 'intel';
        if (combined.includes('qualcomm') || combined.includes('adreno')) return 'qualcomm';
        if (combined.includes('arm') || combined.includes('mali')) return 'arm';

        return vendor || 'unknown';
    }

    /**
     * Run computation performance test
     */
    async runComputePerformanceTest() {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }

        try {
            const results = {};

            // Simple computation test
            const simpleComputeShader = `
                @compute @workgroup_size(64)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let index = global_id.x;
                    // Simple computation test
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

            // Create command encoder
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
            console.warn('WebGPU computation performance test failed:', error);
            return {
                status: 'failed',
                error: error.message,
                simpleCompute: 0
            };
        }
    }

    /**
     * Cleanup resources
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

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGPUFingerprinter;
} else if (typeof window !== 'undefined') {
    window.WebGPUFingerprinter = WebGPUFingerprinter;
}
