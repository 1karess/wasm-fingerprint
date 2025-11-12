// Node.js WASM functionality test
const fs = require('fs');
const path = require('path');

async function testWASM() {
    try {
        console.log('Starting WASM functionality test...');

        // Read WASM file
        const wasmPath = path.join(__dirname, 'build', 'wasm-fingerprint.wasm');
        const wasmBytes = fs.readFileSync(wasmPath);
        console.log(`WASM file size: ${wasmBytes.length} bytes`);

        // Create WASM instance
        const wasmModule = await WebAssembly.instantiate(wasmBytes, {
            env: {
                emscripten_resize_heap: () => false
            },
            wasi_snapshot_preview1: {}
        });

        console.log('✅ WASM module loaded successfully');

        // Get exported functions
        const exports = wasmModule.instance.exports;
        const exportedFunctions = Object.keys(exports).filter(key =>
            typeof exports[key] === 'function' && !key.startsWith('_emscripten')
        );

        console.log(`Exported functions (${exportedFunctions.length}):`, exportedFunctions.slice(0, 10));

        // Test memory access functions
        if (exports.sequential_access_test) {
            console.log('\nTesting memory access functions...');

            const seqResult = exports.sequential_access_test(32, 100);
            console.log(`  Sequential access test result: ${seqResult}`);

            const randResult = exports.random_access_test(32, 100);
            console.log(`  Random access test result: ${randResult}`);
        }

        // Test compute functions
        if (exports.float_precision_test) {
            console.log('\nTesting compute functions...');

            const floatResult = exports.float_precision_test(1000);
            console.log(`  Floating-point precision test: ${floatResult}`);

            const intResult = exports.integer_optimization_test(1000);
            console.log(`  Integer optimization test: ${intResult}`);

            const vectorResult = exports.vector_computation_test(100);
            console.log(`  Vector computation test: ${vectorResult}`);
        }

        // Test cache detection
        if (exports.l1_cache_size_detection) {
            console.log('\nTesting cache detection...');

            const l1Size = exports.l1_cache_size_detection(64);
            console.log(`  L1 cache size detection: ${l1Size}KB`);

            const cacheLineSize = exports.cache_line_size_detection();
            console.log(`  Cache line size detection: ${cacheLineSize} bytes`);
        }

        console.log('\nWASM functionality test completed!');

        // Quick validation test
        console.log('\nQuick validation...');
        await runQuickValidation(exports);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Simplified quick validation test
async function runQuickValidation(exports) {
    console.log('Basic Functionality Validation:');

    // Test basic functionality
    try {
        const seq = exports.sequential_access_test(32, 10);
        const rand = exports.random_access_test(32, 10);

        if (isFinite(seq) && isFinite(rand) && seq !== 0 && rand !== 0) {
            const ratio = Math.abs(rand / seq);
            console.log(`✅ Memory access test passed: ratio=${ratio.toFixed(2)}`);
        } else {
            console.log(`❌ Memory access test anomaly (seq=${seq}, rand=${rand})`);
        }
    } catch (error) {
        console.log(`❌ Memory access test failed: ${error.message}`);
    }

    // Test compute functions
    const computeTests = [
        { name: "Floating-point precision", funcName: 'float_precision_test' },
        { name: "Integer optimization", funcName: 'integer_optimization_test' }
    ];

    for (const test of computeTests) {
        try {
            if (exports[test.funcName]) {
                const result = exports[test.funcName](1000);
                console.log(`✅ ${test.name} test: ${isFinite(result) && result !== 0 ? 'Normal' : 'Abnormal'}`);
            } else {
                console.log(`⚠️ ${test.name} function does not exist`);
            }
        } catch (error) {
            console.log(`❌ ${test.name} test failed: ${error.message}`);
        }
    }

    // Simple CPU type inference
    try {
        const seq = exports.sequential_access_test(32, 100);
        const rand = exports.random_access_test(32, 100);

        if (isFinite(seq) && isFinite(rand) && seq !== 0 && rand !== 0) {
            const memRatio = Math.abs(rand / seq);
            console.log(`Memory Access Ratio: ${memRatio.toFixed(3)}`);

            let cpuType = "Unknown Architecture";
            if (memRatio >= 0.7 && memRatio < 1.6) {
                cpuType = "Apple Silicon";
            } else if (memRatio >= 1.6 && memRatio <= 2.5) {
                cpuType = "Intel High-Performance CPU";
            } else if (memRatio > 2.5) {
                cpuType = "AMD Ryzen/Mainstream CPU";
            }

            console.log(`Inferred CPU Type: ${cpuType}`);
        } else {
            console.log(`❌ CPU inference failed: Invalid test results (seq=${seq}, rand=${rand})`);
        }
    } catch (error) {
        console.log(`❌ CPU inference failed: ${error.message}`);
    }
}

testWASM();