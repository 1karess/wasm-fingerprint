# 🔍 WASM三重检测 - 设备指纹识别工具

基于WebAssembly的先进设备指纹识别系统，融合WASM + WebGL + WebGPU三重检测技术，能够精确识别CPU架构、GPU型号和设备特征。

## 🎯 项目概述

利用WASM的确定性执行环境、WebGL的渲染特征和WebGPU的计算能力，实现精确的设备型号识别。

### 🚀 核心功能
- **🔧 WASM CPU深度分析** - CPU微架构特征检测
- **🎨 WebGL GPU检测** - GPU基础信息和渲染特征
- **⚡ WebGPU高级检测** - GPU性能分析和时序攻击
- **🚀 三重检测** - 融合所有技术的终极精度识别
- **🧬 完整特征分析** - 详细的缓存和性能分析

### 🍎 特别优化
- **Apple Silicon专项适配** - 针对M1/M2/M3/M4芯片优化
- **统一内存架构支持** - 正确识别Apple独特内存模式
- **强预取器检测** - 识别高端CPU预取器特征

## 🚀 快速开始

### 📥 下载方式
```bash
# 方法1: Git克隆
git clone [你的仓库地址]
cd WASM_三重检测

# 方法2: 直接下载
# 访问GitHub仓库 → 点击"Code" → "Download ZIP" → 解压
```

### 🌐 运行测试

#### 网页版（推荐）
```bash
# 启动服务器（三选一）
python3 -m http.server 8080    # Python 3
python -m http.server 8080     # Python 2.7+
npx serve .                    # Node.js

# 然后访问：http://localhost:8080/enhanced-detection.html
```

#### 命令行版
```bash
node test-wasm.js
```

### 📐 校准与验证（可选）
收集浏览器端样本（增强页面 → “导出校准样本JSON”），将生成的JSON放入 `docs/device-database/samples/`，然后：

```bash
node tools/calibrate.js ingest     # 计算阈值区间，生成 calibration.json
node tools/calibrate.js validate   # 对 expected.json 做回归测试
```

在 `docs/device-database/` 中查看 `calibration.json` 和 `regression-report.json`。

### 🎯 测试步骤
1. **🔧 WASM CPU深度分析** - 开始基础检测
2. **🚀 三重检测** - 获得最高精度结果
3. **🧬 完整特征分析** - 查看详细技术数据

## 📁 项目结构

```
/
├── enhanced-detection.html    # 🎯 主要检测界面
├── src/
│   ├── wasm/                  # WASM C源代码
│   │   ├── memory-tests.c     # 内存访问测试
│   │   └── compute-tests.c    # 计算性能测试
│   └── common.js              # 共享JavaScript库
├── build/                     # 编译输出
│   ├── wasm-fingerprint.js
│   └── wasm-fingerprint.wasm
├── examples/                  # 示例和工具
│   ├── basic-detection.html   # 基础检测示例
│   ├── validation-tests.html  # 代码验证工具
│   └── diagnostic-tool.html   # 性能诊断工具
├── docs/                      # 详细文档
└── tools/                     # 构建工具
```

## 🔧 构建说明

需要Emscripten SDK：

```bash
# 激活环境
source emsdk/emsdk_env.sh

# 编译WASM模块
make

# 或者清理重建
make clean && make
```

## 📊 检测原理

### 内存访问测试
```c
// 顺序访问 - 缓存友好
for (int i = 0; i < size; i += 64) {
    volatile char temp = buffer[i];
}

// 随机访问 - 触发缓存未命中
int index = random() % (size - 64);
volatile char temp = buffer[index];
```

**时间比例分析**：
- Apple Silicon: ~1.0-1.5 (优秀的预取器)
- Intel高端: ~1.5-2.5 (强大缓存层次)
- AMD Ryzen: ~1.5-3.0 (平衡设计)
- ARM移动: ~2.0-4.0 (功耗优化)

### 计算性能测试
- **浮点精度**：不同FPU的舍入误差模式
- **整数优化**：编译器和CPU优化差异
- **向量计算**：SIMD指令集支持检测
- **分支预测**：条件分支执行效率

## 📊 检测精度

### ✅ 已实现功能
- **CPU架构识别**：85-95% 准确率
- **GPU型号识别**：80-90% 准确率
- **设备型号推测**：70-90% 准确率
- **Apple Silicon优化**：95%+ 准确率
- **缓存层次分析**：L1/L2/L3边界检测
- **预取器特征识别**：强/中/弱分类

### 🎯 支持设备
- **Apple系列**：MacBook Air/Pro M1/M2/M3/M4
- **Intel系列**：Core i5/i7/i9 + 集成/独立显卡
- **AMD系列**：Ryzen + Radeon显卡
- **移动设备**：高端Android设备

### 🔬 测试结果示例
```
🎯 设备识别结果:
   设备型号: Apple Silicon 设备
   CPU型号: Apple M4 Pro
   GPU型号: Apple M4 Pro GPU
   综合置信度: 95%
```

⚠️ **技术限制**：
- 浏览器安全策略影响计时精度
- WASM标准化降低硬件差异
- 部分功能需要现代浏览器支持

## 📈 技术创新

1. **突破WASM限制**
   - 高精度性能计时
   - 微基准测试设计
   - 统计分析方法

2. **CPU特征工程**
   - 多维度性能指标
   - 时序模式分析
   - 特征融合算法

## 🔒 安全考虑

此研究用于**学术和防御目的**：
- 理解性能指纹攻击
- 开发检测和防护技术
- 提升浏览器安全意识

## 📚 详细文档

查看 `docs/README.md` 获取完整技术文档和API说明。

## 🤝 贡献指南

欢迎贡献：
- 新的检测算法
- 真实设备测试数据
- 防护机制研究
- 文档改进

---

*🔬 用于CPU微架构研究的实验性项目*
