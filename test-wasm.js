// Node.js测试WASM功能
const fs = require('fs');
const path = require('path');

async function testWASM() {
    try {
        console.log('🔧 开始WASM功能测试...');

        // 读取WASM文件
        const wasmPath = path.join(__dirname, 'build', 'wasm-fingerprint.wasm');
        const wasmBytes = fs.readFileSync(wasmPath);
        console.log(`📦 WASM文件大小: ${wasmBytes.length} 字节`);

        // 创建WASM实例
        const wasmModule = await WebAssembly.instantiate(wasmBytes, {
            env: {
                emscripten_resize_heap: () => false
            },
            wasi_snapshot_preview1: {}
        });

        console.log('✅ WASM模块加载成功');

        // 获取导出函数
        const exports = wasmModule.instance.exports;
        const exportedFunctions = Object.keys(exports).filter(key =>
            typeof exports[key] === 'function' && !key.startsWith('_emscripten')
        );

        console.log(`📋 导出函数 (${exportedFunctions.length}个):`, exportedFunctions.slice(0, 10));

        // 测试内存访问函数
        if (exports.sequential_access_test) {
            console.log('\n🧠 测试内存访问函数...');

            const seqResult = exports.sequential_access_test(32, 100);
            console.log(`  顺序访问测试结果: ${seqResult}`);

            const randResult = exports.random_access_test(32, 100);
            console.log(`  随机访问测试结果: ${randResult}`);
        }

        // 测试计算函数
        if (exports.float_precision_test) {
            console.log('\n🧮 测试计算函数...');

            const floatResult = exports.float_precision_test(1000);
            console.log(`  浮点精度测试: ${floatResult}`);

            const intResult = exports.integer_optimization_test(1000);
            console.log(`  整数优化测试: ${intResult}`);

            const vectorResult = exports.vector_computation_test(100);
            console.log(`  向量计算测试: ${vectorResult}`);
        }

        // 测试缓存检测
        if (exports.l1_cache_size_detection) {
            console.log('\n🔍 测试缓存检测...');

            const l1Size = exports.l1_cache_size_detection(64);
            console.log(`  L1缓存大小检测: ${l1Size}KB`);

            const cacheLineSize = exports.cache_line_size_detection();
            console.log(`  缓存行大小检测: ${cacheLineSize}字节`);
        }

        console.log('\n🎉 WASM功能测试完成！');

        // 快速验证测试
        console.log('\n🧪 快速验证...');
        await runQuickValidation(exports);

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 简化的快速验证测试
async function runQuickValidation(exports) {
    console.log('📋 基础功能验证:');

    // 测试基础功能
    try {
        const seq = exports.sequential_access_test(32, 10);
        const rand = exports.random_access_test(32, 10);

        if (isFinite(seq) && isFinite(rand) && seq !== 0 && rand !== 0) {
            const ratio = Math.abs(rand / seq);
            console.log(`✅ 内存访问测试通过: 比例=${ratio.toFixed(2)}`);
        } else {
            console.log(`❌ 内存访问测试异常 (seq=${seq}, rand=${rand})`);
        }
    } catch (error) {
        console.log(`❌ 内存访问测试失败: ${error.message}`);
    }

    // 测试计算函数
    const computeTests = [
        { name: "浮点精度", funcName: 'float_precision_test' },
        { name: "整数优化", funcName: 'integer_optimization_test' }
    ];

    for (const test of computeTests) {
        try {
            if (exports[test.funcName]) {
                const result = exports[test.funcName](1000);
                console.log(`✅ ${test.name}测试: ${isFinite(result) && result !== 0 ? '正常' : '异常'}`);
            } else {
                console.log(`⚠️ ${test.name}函数不存在`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}测试失败: ${error.message}`);
        }
    }

    // 简单CPU类型推断
    try {
        const seq = exports.sequential_access_test(32, 100);
        const rand = exports.random_access_test(32, 100);

        if (isFinite(seq) && isFinite(rand) && seq !== 0 && rand !== 0) {
            const memRatio = Math.abs(rand / seq);
            console.log(`📊 内存访问比例: ${memRatio.toFixed(3)}`);

            let cpuType = "未知架构";
            if (memRatio >= 0.7 && memRatio < 1.6) {
                cpuType = "Apple Silicon";
            } else if (memRatio >= 1.6 && memRatio <= 2.5) {
                cpuType = "Intel高性能CPU";
            } else if (memRatio > 2.5) {
                cpuType = "AMD Ryzen/主流CPU";
            }

            console.log(`🎯 推断CPU类型: ${cpuType}`);
        } else {
            console.log(`❌ CPU推断失败: 无效的测试结果 (seq=${seq}, rand=${rand})`);
        }
    } catch (error) {
        console.log(`❌ CPU推断失败: ${error.message}`);
    }
}

testWASM();