#!/usr/bin/env python3
"""
WASM构建脚本
使用Emscripten编译C代码为WebAssembly
"""

import os
import subprocess
import sys
from pathlib import Path

def check_emscripten():
    """检查Emscripten是否可用"""
    try:
        result = subprocess.run(['emcc', '--version'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Emscripten版本: {result.stdout.split()[1]}")
            return True
        else:
            return False
    except FileNotFoundError:
        return False

def compile_wasm():
    """编译WASM模块"""
    project_root = Path(__file__).parent.parent
    src_dir = project_root / "src" / "wasm"
    build_dir = project_root / "build"

    # 确保构建目录存在
    build_dir.mkdir(exist_ok=True)

    # 编译命令
    source_files = [
        str(src_dir / "memory-test.c"),
        str(src_dir / "compute-test.c")
    ]

    output_file = str(build_dir / "wasm-tests")

    emcc_args = [
        'emcc',
        *source_files,
        '-o', f'{output_file}.js',
        '-s', 'WASM=1',
        '-s', 'EXPORTED_RUNTIME_METHODS=["ccall","cwrap"]',
        '-s', 'ALLOW_MEMORY_GROWTH=1',
        '-s', 'INITIAL_MEMORY=16MB',
        '-s', 'MAXIMUM_MEMORY=64MB',
        '-O2',  # 优化等级
        '--no-entry',  # 不需要main函数
        '-s', 'MODULARIZE=1',
        '-s', 'EXPORT_NAME="WASMModule"',
        '-s', 'ENVIRONMENT=web',
    ]

    print("🔨 开始编译WASM模块...")
    print(f"源文件: {', '.join(source_files)}")
    print(f"输出目录: {build_dir}")

    try:
        result = subprocess.run(emcc_args, capture_output=True, text=True, cwd=project_root)

        if result.returncode == 0:
            print("✅ WASM编译成功!")
            print(f"生成文件:")
            print(f"  - {output_file}.js")
            print(f"  - {output_file}.wasm")
            return True
        else:
            print("❌ 编译失败:")
            print(result.stderr)
            return False

    except Exception as e:
        print(f"❌ 编译过程出错: {e}")
        return False

def create_simple_test():
    """创建简单的测试文件"""
    project_root = Path(__file__).parent.parent
    test_file = project_root / "test-simple.html"

    html_content = """<!DOCTYPE html>
<html>
<head>
    <title>WASM简单测试</title>
</head>
<body>
    <h1>WASM加载测试</h1>
    <div id="output"></div>

    <script>
        const output = document.getElementById('output');

        // 尝试加载WASM模块
        fetch('./build/wasm-tests.wasm')
            .then(response => {
                if (response.ok) {
                    output.innerHTML += '<p>✅ WASM文件加载成功</p>';
                    return response.arrayBuffer();
                } else {
                    throw new Error('WASM文件不存在');
                }
            })
            .then(bytes => {
                output.innerHTML += '<p>📦 WASM文件大小: ' + bytes.byteLength + ' 字节</p>';
                return WebAssembly.instantiate(bytes);
            })
            .then(results => {
                output.innerHTML += '<p>🚀 WASM模块实例化成功</p>';

                // 列出导出的函数
                const exports = Object.keys(results.instance.exports);
                output.innerHTML += '<p>🔧 导出函数: ' + exports.join(', ') + '</p>';

                // 测试一个简单函数
                if (results.instance.exports.sequential_access_test) {
                    const result = results.instance.exports.sequential_access_test(16, 1000);
                    output.innerHTML += '<p>🧪 测试函数调用结果: ' + result + '</p>';
                }
            })
            .catch(error => {
                output.innerHTML += '<p>❌ 错误: ' + error.message + '</p>';
            });
    </script>
</body>
</html>"""

    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ 创建测试文件: {test_file}")

def main():
    print("🚀 WASM项目构建工具")
    print("=" * 40)

    # 检查Emscripten
    if not check_emscripten():
        print("❌ 未找到Emscripten")
        print("请安装Emscripten SDK:")
        print("  git clone https://github.com/emscripten-core/emsdk.git")
        print("  cd emsdk")
        print("  ./emsdk install latest")
        print("  ./emsdk activate latest")
        print("  source ./emsdk_env.sh")
        sys.exit(1)

    # 编译WASM
    if compile_wasm():
        print("\n📁 项目结构:")
        project_root = Path(__file__).parent.parent
        for path in sorted(project_root.rglob("*")):
            if path.is_file() and not path.name.startswith('.'):
                print(f"  {path.relative_to(project_root)}")

        # 创建简单测试
        create_simple_test()

        print("\n🎯 下一步:")
        print("1. 启动本地HTTP服务器:")
        print("   python -m http.server 8080")
        print("2. 打开浏览器访问:")
        print("   http://localhost:8080/test-simple.html")
        print("   http://localhost:8080/src/html/test.html")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()