# WASM指纹项目Makefile

# 路径设置
SRC_DIR = src/wasm
BUILD_DIR = build
JS_DIR = src/js
HTML_DIR = src/html

# 源文件
C_SOURCES = $(SRC_DIR)/memory-tests.c $(SRC_DIR)/compute-tests.c
OUTPUT_NAME = wasm-fingerprint

# Emscripten编译器设置
CC = emcc
CFLAGS = -O2 --no-entry
LDFLAGS = \
	-s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS=["ccall","cwrap"] \
	-s EXPORTED_FUNCTIONS=["_malloc","_free"] \
	-s EXPORT_ALL=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s INITIAL_MEMORY=16MB \
	-s MAXIMUM_MEMORY=64MB \
	-s MODULARIZE=1 \
	-s EXPORT_NAME="WASMModule" \
	-s ENVIRONMENT=web

# 目标文件
WASM_OUTPUT = $(BUILD_DIR)/$(OUTPUT_NAME).wasm
JS_OUTPUT = $(BUILD_DIR)/$(OUTPUT_NAME).js

.PHONY: all clean check install-emsdk serve test

# 开发服务器配置
PORT ?= 8080
BIND ?= 127.0.0.1

# 默认目标
all: $(WASM_OUTPUT)

# 创建构建目录
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# 编译WASM
$(WASM_OUTPUT): $(C_SOURCES) | $(BUILD_DIR)
	$(CC) $(C_SOURCES) -o $(BUILD_DIR)/$(OUTPUT_NAME).js $(CFLAGS) $(LDFLAGS)

# 检查Emscripten
check:
	@echo "检查Emscripten安装状态..."
	@which emcc > /dev/null && echo "✅ Emscripten已安装" || echo "❌ Emscripten未安装"
	@which emcc > /dev/null && emcc --version || true

# 安装Emscripten SDK (仅限Linux/macOS)
install-emsdk:
	@echo "安装Emscripten SDK..."
	git clone https://github.com/emscripten-core/emsdk.git
	cd emsdk && ./emsdk install latest
	cd emsdk && ./emsdk activate latest
	@echo "⚠️  请运行: source emsdk/emsdk_env.sh"

# 启动本地服务器
serve:
	@echo "启动本地HTTP服务器..."
	@echo "访问地址: http://$(BIND):$(PORT)/enhanced-detection.html"
	@echo "（如端口被占用，可运行 \"make serve PORT=8081\"）"
	python3 -m http.server $(PORT) --bind $(BIND)

# 创建简单测试文件
test-simple:
	@echo "创建简单测试文件..."
	@python3 -c "import pathlib; pathlib.Path('test-simple.html').write_text('''<!DOCTYPE html>\n<html>\n<head>\n    <title>WASM简单测试</title>\n    <style>\n        body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #fff; }\n        .status { padding: 10px; margin: 5px 0; border-radius: 4px; }\n        .success { background: #0d5016; }\n        .error { background: #5d1a1a; }\n        .info { background: #1a3d5d; }\n    </style>\n</head>\n<body>\n    <h1>🔬 WASM指纹测试</h1>\n    <div id=\"output\"></div>\n    <script>\n        const output = document.getElementById(\"output\");\n        function addStatus(message, type = \"info\") {\n            const div = document.createElement(\"div\");\n            div.className = \"status \" + type;\n            div.innerHTML = message;\n            output.appendChild(div);\n        }\n        addStatus(\"🚀 开始WASM测试...\", \"info\");\n        fetch(\"./build/wasm-tests.wasm\")\n            .then(response => {\n                if (response.ok) {\n                    addStatus(\"✅ WASM文件加载成功\", \"success\");\n                    return response.arrayBuffer();\n                } else {\n                    throw new Error(\"WASM文件不存在，请先运行 make\");\n                }\n            })\n            .then(bytes => {\n                addStatus(\"📦 WASM文件大小: \" + bytes.byteLength + \" 字节\", \"info\");\n                return WebAssembly.instantiate(bytes);\n            })\n            .then(results => {\n                addStatus(\"🚀 WASM模块实例化成功\", \"success\");\n                const exports = Object.keys(results.instance.exports);\n                addStatus(\"🔧 导出函数 (\" + exports.length + \"个): \" + exports.join(\", \"), \"info\");\n                if (results.instance.exports.sequential_access_test) {\n                    const start = performance.now();\n                    const result = results.instance.exports.sequential_access_test(16, 1000);\n                    const end = performance.now();\n                    addStatus(\"🧪 顺序访问测试: 结果=\" + result + \", 用时=\" + (end-start).toFixed(2) + \"ms\", \"success\");\n                }\n                if (results.instance.exports.float_precision_test) {\n                    const start = performance.now();\n                    const result = results.instance.exports.float_precision_test(1000);\n                    const end = performance.now();\n                    addStatus(\"🧮 浮点精度测试: 结果=\" + result.toFixed(6) + \", 用时=\" + (end-start).toFixed(2) + \"ms\", \"success\");\n                }\n                addStatus(\"🎉 基础测试完成，可以前往完整测试页面: <a href=\\\"src/html/test.html\\\" style=\\\"color: #58a6ff;\\\">src/html/test.html</a>\", \"success\");\n            })\n            .catch(error => {\n                addStatus(\"❌ 错误: \" + error.message, \"error\");\n                addStatus(\"💡 解决方案: 1) 安装Emscripten 2) 运行 make 3) 启动本地服务器\", \"info\");\n            });\n    </script>\n</body>\n</html>''')"
	@echo "✅ 测试文件已创建: test-simple.html"

# 清理构建文件
clean:
	rm -rf $(BUILD_DIR)
	rm -f test-simple.html

# 显示帮助信息
help:
	@echo "WASM指纹项目构建工具"
	@echo "====================="
	@echo ""
	@echo "可用命令:"
	@echo "  make check        - 检查Emscripten是否安装"
	@echo "  make install-emsdk - 安装Emscripten SDK"
	@echo "  make all          - 编译WASM模块"
	@echo "  make test-simple  - 创建简单测试页面"
	@echo "  make serve        - 启动本地HTTP服务器"
	@echo "  make clean        - 清理构建文件"
	@echo ""
	@echo "完整流程:"
	@echo "  1. make install-emsdk  # 安装Emscripten"
	@echo "  2. source emsdk/emsdk_env.sh  # 设置环境变量"
	@echo "  3. make all           # 编译WASM"
	@echo "  4. make test-simple   # 创建测试文件"
	@echo "  5. make serve         # 启动服务器"
	@echo ""
