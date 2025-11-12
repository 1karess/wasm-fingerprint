/**
 * WebGL Device Fingerprinting Module
 * Combine with CPU detection for precise device model identification
 */

class WebGLFingerprinter {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.features = {};
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Create hidden canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = 256;
            this.canvas.height = 256;
            this.canvas.style.display = 'none';
            document.body.appendChild(this.canvas);

            // Get WebGL context
            this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

            if (!this.gl) {
                throw new Error('WebGL not supported');
            }

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            return false;
        }
    }

    /**
     * Get GPU basic information
     */
    getBasicGPUInfo() {
        if (!this.gl) return {};

        const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');

        return {
            vendor: this.gl.getParameter(this.gl.VENDOR),
            renderer: debugInfo ?
                this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) :
                this.gl.getParameter(this.gl.RENDERER),
            version: this.gl.getParameter(this.gl.VERSION),
            shadingLanguageVersion: this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION)
        };
    }

    /**
     * Get list of supported extensions
     */
    getSupportedExtensions() {
        if (!this.gl) return [];

        const extensions = this.gl.getSupportedExtensions() || [];

        // Key GPU feature extensions
        const importantExtensions = [
            'WEBGL_debug_renderer_info',
            'OES_texture_float',
            'OES_texture_half_float',
            'WEBGL_lose_context',
            'EXT_texture_filter_anisotropic',
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_etc1',
            'EXT_sRGB',
            'WEBGL_depth_texture'
        ];

        return {
            all: extensions,
            important: extensions.filter(ext => importantExtensions.includes(ext)),
            count: extensions.length
        };
    }

    /**
     * Generate Canvas rendering fingerprint
     */
    generateCanvasFingerprint() {
        if (!this.gl) return { primary: '', variants: {} };

        const hashes = {
            primary: '',
            variants: {}
        };

        try {
            hashes.primary = this.renderPrimaryWebGLHash();
        } catch (error) {
            console.error('Canvas fingerprint generation failed:', error);
        }

        try {
            hashes.variants.blend = this.renderBlendFingerprint();
        } catch (error) {
            console.warn('WebGL hybrid fingerprint generation failed:', error);
        }

        try {
            hashes.variants.canvas2d = this.generateCanvas2DHash();
        } catch (error) {
            console.warn('Canvas2D fingerprint generation failed:', error);
        }

        return hashes;
    }

    renderPrimaryWebGLHash() {
        // Clear canvas
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec3 a_color;
            varying vec3 v_color;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_color = a_color;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 v_color;
            void main() {
                float noise = sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453;
                noise = fract(noise);
                gl_FragColor = vec4(v_color + vec3(noise * 0.1), 1.0);
            }
        `;

        const program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
        if (!program) return '';

        this.gl.useProgram(program);

        const vertices = new Float32Array([
            -0.5, -0.5,    1.0, 0.0, 0.0,
             0.5, -0.5,    0.0, 1.0, 0.0,
             0.0,  0.5,    0.0, 0.0, 1.0,

            -0.8,  0.2,    1.0, 1.0, 0.0,
             0.8,  0.2,    1.0, 0.0, 1.0,
             0.0,  0.8,    0.0, 1.0, 1.0
        ]);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(program, 'a_position');
        const colorLocation = this.gl.getAttribLocation(program, 'a_color');

        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 20, 0);

        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 20, 8);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        const pixels = new Uint8Array(256 * 256 * 4);
        this.gl.readPixels(0, 0, 256, 256, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

        this.gl.deleteProgram(program);
        this.gl.deleteBuffer(buffer);

        return this.calculatePixelHash(pixels);
    }

    renderBlendFingerprint() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            varying vec4 v_color;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_color = a_color;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec4 v_color;
            void main() {
                float ripple = sin(gl_FragCoord.x * 0.05) * cos(gl_FragCoord.y * 0.05);
                gl_FragColor = vec4(v_color.rgb * (0.8 + ripple * 0.2), v_color.a);
            }
        `;

        const program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
        if (!program) {
            this.gl.disable(this.gl.BLEND);
            return '';
        }

        this.gl.useProgram(program);

        const vertices = new Float32Array([
            -0.9, -0.9,    1.0, 0.2, 0.2, 0.7,
             0.9, -0.4,    0.2, 1.0, 0.2, 0.6,
            -0.4,  0.9,    0.2, 0.2, 1.0, 0.5,

             0.7, -0.7,    1.0, 1.0, 0.2, 0.5,
             0.9,  0.9,    0.2, 1.0, 1.0, 0.4,
            -0.6,  0.4,    1.0, 0.4, 1.0, 0.6
        ]);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(program, 'a_position');
        const colorLocation = this.gl.getAttribLocation(program, 'a_color');

        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 24, 0);

        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 24, 8);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        const pixels = new Uint8Array(128 * 128 * 4);
        this.gl.readPixels(0, 0, 128, 128, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

        this.gl.disable(this.gl.BLEND);
        this.gl.deleteProgram(program);
        this.gl.deleteBuffer(buffer);

        return this.calculatePixelHash(pixels);
    }

    generateCanvas2DHash() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#102030';
        ctx.fillRect(0, 0, 256, 256);

        const gradient = ctx.createLinearGradient(0, 0, 256, 256);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#4ecdc4');
        gradient.addColorStop(1, '#1a535c');
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillRect(16, 16, 224, 224);

        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '24px "Arial"';
        ctx.fillStyle = '#f7fff7';
        ctx.textBaseline = 'top';
        ctx.fillText('WASM-FP', 20.5, 20.5);
        ctx.fillStyle = 'rgba(30, 144, 255, 0.7)';
        ctx.fillText('WASM-FP', 22.5, 24.5);

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(32, 200);
        for (let x = 32; x <= 224; x += 8) {
            const y = 200 + Math.sin(x * 0.15) * 20;
            ctx.lineTo(x, y);
        }
        ctx.stroke();

        const imageData = ctx.getImageData(0, 0, 256, 256).data;
        return this.calculatePixelHash(imageData);
    }

    calculatePixelHash(pixelArray) {
        if (!pixelArray || !pixelArray.length) return '';
        let hash = 0;
        for (let i = 0; i < pixelArray.length; i += 4) {
            const pixel = (pixelArray[i] << 16) | (pixelArray[i + 1] << 8) | pixelArray[i + 2];
            hash = ((hash << 5) - hash + pixel) & 0xffffffff;
        }
        const normalized = (hash >>> 0).toString(16).padStart(8, '0');
        return normalized;
    }

    /**
     * Create shader program
     */
    createShaderProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) return null;

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Shader program linking failed:', this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    /**
     * Create shader
     */
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    /**
     * Test GPU rendering performance
     */
    async measureRenderingPerformance() {
        if (!this.gl) return {};

        const results = {};

        try {
            // Test 1: Simple triangle rendering
            const simpleStart = performance.now();
            for (let i = 0; i < 100; i++) {
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
            }
            results.simpleRender = performance.now() - simpleStart;

            // Test 2: Complex fragment shader rendering
            const complexStart = performance.now();

            // Create complex fragment shader
            const complexFragmentShader = `
                precision mediump float;
                void main() {
                    vec2 coord = gl_FragCoord.xy / 512.0;
                    float result = 0.0;
                    for (int i = 0; i < 100; i++) {
                        float fi = float(i);
                        result += sin(coord.x * fi + fi * 0.1) * cos(coord.y * fi + fi * 0.1);
                        result += sqrt(coord.x * coord.y + fi * 0.01);
                    }
                    result = mod(result, 1.0);
                    gl_FragColor = vec4(result, result * 0.8, result * 0.6, 1.0);
                }
            `;

            try {
                // Create and compile complex shader
                const vertexShaderSource = `
                    attribute vec2 position;
                    void main() {
                        gl_Position = vec4(position, 0.0, 1.0);
                    }
                `;

                const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
                this.gl.shaderSource(vertexShader, vertexShaderSource);
                this.gl.compileShader(vertexShader);

                const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
                this.gl.shaderSource(fragmentShader, complexFragmentShader);
                this.gl.compileShader(fragmentShader);

                const complexProgram = this.gl.createProgram();
                this.gl.attachShader(complexProgram, vertexShader);
                this.gl.attachShader(complexProgram, fragmentShader);
                this.gl.linkProgram(complexProgram);

                if (this.gl.getProgramParameter(complexProgram, this.gl.LINK_STATUS)) {
                    this.gl.useProgram(complexProgram);

                    // Create fullscreen quad for complex rendering
                    const quadVertices = new Float32Array([
                        -1, -1,  1, -1,  -1, 1,
                         1, -1,   1, 1,   -1, 1
                    ]);

                    const quadBuffer = this.gl.createBuffer();
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

                    const positionLocation = this.gl.getAttribLocation(complexProgram, 'position');
                    this.gl.enableVertexAttribArray(positionLocation);
                    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

                    // Execute complex rendering test - multiple draws to increase GPU workload
                    for (let i = 0; i < 20; i++) {
                        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
                        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
                        this.gl.finish(); // Ensure GPU completes rendering
                    }

                    // Cleanup resources
                    this.gl.deleteProgram(complexProgram);
                    this.gl.deleteShader(vertexShader);
                    this.gl.deleteShader(fragmentShader);
                    this.gl.deleteBuffer(quadBuffer);
                }

                results.complexRender = performance.now() - complexStart;
            } catch (error) {
                console.warn('Complex shader test failed, using fallback:', error);
                // If complex shader fails, at least do some workload test
                for (let i = 0; i < 50; i++) {
                    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
                    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
                }
                this.gl.finish();
                results.complexRender = performance.now() - complexStart;
            }

            // Test 3: Texture operation performance
            const textureStart = performance.now();
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            const textureData = new Uint8Array(256 * 256 * 4);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 256, 256, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureData);
            this.gl.deleteTexture(texture);
            results.textureOps = performance.now() - textureStart;

        } catch (error) {
            console.error('GPU performance test failed:', error);
        }

        return results;
    }

    /**
     * Test floating-point precision features
     */
    getFloatingPointPrecision() {
        if (!this.gl) return {};

        return {
            vertexHighFloat: this.gl.getShaderPrecisionFormat(this.gl.VERTEX_SHADER, this.gl.HIGH_FLOAT),
            vertexMediumFloat: this.gl.getShaderPrecisionFormat(this.gl.VERTEX_SHADER, this.gl.MEDIUM_FLOAT),
            vertexLowFloat: this.gl.getShaderPrecisionFormat(this.gl.VERTEX_SHADER, this.gl.LOW_FLOAT),
            fragmentHighFloat: this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.HIGH_FLOAT),
            fragmentMediumFloat: this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.MEDIUM_FLOAT),
            fragmentLowFloat: this.gl.getShaderPrecisionFormat(this.gl.FRAGMENT_SHADER, this.gl.LOW_FLOAT)
        };
    }

    /**
     * Get GPU limit parameters
     */
    getGPULimits() {
        if (!this.gl) return {};

        try {
            return {
                maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
                maxViewportDims: this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS),
                maxVertexAttribs: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
                maxVertexTextureImageUnits: this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
                maxTextureImageUnits: this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS),
                maxCombinedTextureImageUnits: this.gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
                maxFragmentUniformVectors: this.gl.getParameter(this.gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                maxVertexUniformVectors: this.gl.getParameter(this.gl.MAX_VERTEX_UNIFORM_VECTORS),
                maxVaryingVectors: this.gl.getParameter(this.gl.MAX_VARYING_VECTORS),
                aliasedLineWidthRange: this.gl.getParameter(this.gl.ALIASED_LINE_WIDTH_RANGE),
                aliasedPointSizeRange: this.gl.getParameter(this.gl.ALIASED_POINT_SIZE_RANGE)
            };
        } catch (error) {
            console.error('Failed to get GPU limits:', error);
            return {};
        }
    }

    /**
     * Execute complete WebGL fingerprint recognition
     */
    async generateFingerprint() {
        if (!await this.initialize()) {
            return null;
        }

        const canvasHashes = this.generateCanvasFingerprint();

        const fingerprint = {
            basic: this.getBasicGPUInfo(),
            extensions: this.getSupportedExtensions(),
            canvasHash: canvasHashes.primary,
            canvasVariants: canvasHashes.variants,
            performance: await this.measureRenderingPerformance(),
            precision: this.getFloatingPointPrecision(),
            limits: this.getGPULimits(),
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
     * Analyze GPU model (based on WebGL features)
     */
    analyzeGPUModel(fingerprint) {
        if (!fingerprint) return { model: 'Unknown', confidence: 0, evidence: [] };

        const evidence = [];
        let confidence = 0;
        let model = 'UnknownGPU';

        // Analyze renderer string
        const renderer = fingerprint.basic.renderer || '';
        const vendor = fingerprint.basic.vendor || '';
        const normalizedVendor = this._normalizeVendor(renderer, vendor);

        // Apple GPU detection
        if (renderer.includes('Apple') || renderer.includes('M1') || renderer.includes('M2') || renderer.includes('M3')) {
            model = 'Apple Silicon GPU';
            confidence = 90;
            evidence.push('Renderer string contains Apple features');

            if (renderer.includes('M1 Pro') || renderer.includes('M1 Max')) {
                model = 'Apple M1 Pro/Max GPU';
                confidence = 95;
            } else if (renderer.includes('M2')) {
                model = 'Apple M2 GPU';
                confidence = 95;
            }
        }
        // Intel GPU detection
        else if (renderer.includes('Intel') || vendor.includes('Intel')) {
            confidence = 80;
            evidence.push('Intel GPU characteristics');

            if (renderer.includes('Iris Xe')) {
                model = 'Intel Iris Xe Graphics';
                confidence = 90;
            } else if (renderer.includes('UHD')) {
                model = 'Intel UHD Graphics';
                confidence = 85;
            } else if (renderer.includes('HD')) {
                model = 'Intel HD Graphics';
                confidence = 85;
            } else {
                model = 'Intel Integrated Graphics';
            }
        }
        // NVIDIA GPU detection
        else if (renderer.includes('NVIDIA') || renderer.includes('GeForce') || renderer.includes('RTX') || renderer.includes('GTX')) {
            confidence = 85;
            evidence.push('NVIDIA GPU characteristics');

            if (renderer.includes('RTX 4090')) {
                model = 'NVIDIA GeForce RTX 4090';
                confidence = 95;
            } else if (renderer.includes('RTX 4080')) {
                model = 'NVIDIA GeForce RTX 4080';
                confidence = 95;
            } else if (renderer.includes('RTX 30')) {
                model = 'NVIDIA GeForce RTX 30 Series';
                confidence = 90;
            } else if (renderer.includes('RTX')) {
                model = 'NVIDIA GeForce RTX Series';
                confidence = 85;
            } else {
                model = 'NVIDIA Graphics Card';
            }
        }
        // AMD GPU detection
        else if (renderer.includes('AMD') || renderer.includes('Radeon') || renderer.includes('RDNA')) {
            confidence = 80;
            evidence.push('AMD GPU characteristics');

            if (renderer.includes('RX 7900')) {
                model = 'AMD Radeon RX 7900 Series';
                confidence = 95;
            } else if (renderer.includes('RX 6000')) {
                model = 'AMD Radeon RX 6000 Series';
                confidence = 90;
            } else {
                model = 'AMD Radeon Graphics Card';
            }
        }

        // Further analysis based on performance features
        if (fingerprint.performance) {
            const { simpleRender, complexRender } = fingerprint.performance;

            if (simpleRender < 5 && complexRender < 10) {
                evidence.push('High-performance GPU features');
                confidence = Math.min(confidence + 10, 95);
            } else if (simpleRender > 20 || complexRender > 50) {
                evidence.push('Integrated graphics characteristics');
                if (model === 'UnknownGPU') {
                    model = 'Integrated Graphics';
                    confidence = 70;
                }
            }
        }

        // Analysis based on extension support
        if (fingerprint.extensions && fingerprint.extensions.count > 25) {
            evidence.push('Rich extension support');
            confidence = Math.min(confidence + 5, 95);
        }

        const analysis = {
            model,
            confidence,
            evidence,
            rawRenderer: renderer,
            rawVendor: vendor,
            normalizedVendor,
            canvasHash: fingerprint.canvasHash || '',
            canvasVariants: fingerprint.canvasVariants || {}
        };

        // Attach normalized vendor information directly to source fingerprint for subsequent logic reuse
        fingerprint.normalizedVendor = normalizedVendor;

        return analysis;
    }

    /**
     * Normalize vendor/renderer strings returned by WebGL for subsequent database matching
     */
    _normalizeVendor(renderer, vendor) {
        const combined = `${renderer || ''} ${vendor || ''}`.toLowerCase();
        if (!combined.trim()) return 'unknown';

        if (combined.includes('apple') || combined.includes('metal')) return 'apple';
        if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('rtx')) return 'nvidia';
        if (combined.includes('amd') || combined.includes('radeon') || combined.includes('rdna')) return 'amd';
        if (combined.includes('intel') || combined.includes('iris') || combined.includes('uhd') || combined.includes('hd graphics')) return 'intel';
        if (combined.includes('qualcomm') || combined.includes('adreno')) return 'qualcomm';
        if (combined.includes('arm') || combined.includes('mali')) return 'arm';

        return (vendor || renderer || 'unknown').toLowerCase();
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.gl = null;
        this.isInitialized = false;
    }
}

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLFingerprinter;
} else if (typeof window !== 'undefined') {
    window.WebGLFingerprinter = WebGLFingerprinter;
}
