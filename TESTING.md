# 🧪 测试指南

## 🌐 GitHub Pages 在线测试（推荐）

### 快速访问
- **主页面**: https://1karess.github.io/wasm-fingerprint/
- **检测页面**: https://1karess.github.io/wasm-fingerprint/enhanced-detection.html

### 测试步骤

1. **打开检测页面**
   - 直接在浏览器中访问上面的链接
   - 或从主页面自动跳转

2. **执行检测**
   - 点击 "🔧 WASM CPU深度分析" - 开始基础检测
   - 点击 "🚀 三重检测" - 获得最高精度结果
   - 点击 "🧬 完整特征分析" - 查看详细技术数据

3. **查看结果**
   - CPU架构识别结果
   - GPU型号推测
   - 综合置信度
   - 详细的缓存层次分析

### 浏览器要求

- ✅ **Chrome/Edge** (推荐) - 完整支持所有功能
- ✅ **Safari 17+** (macOS) - 支持WebGPU
- ✅ **Firefox** - 基础功能支持
- ⚠️ **移动浏览器** - 部分功能可能受限

## 💻 本地测试

### 方法1: 命令行测试

```bash
# 测试WASM模块基础功能
node test-wasm.js
```

**预期输出：**
- ✅ WASM模块加载成功
- ✅ 内存访问测试通过
- ✅ 计算函数测试通过
- ✅ CPU类型推断结果

### 方法2: 本地服务器

```bash
# 1. 确保WASM已编译
make check  # 检查Emscripten
make        # 编译WASM模块

# 2. 启动服务器
make serve  # 或 python3 -m http.server 8080

# 3. 访问测试页面
# http://localhost:8080/enhanced-detection.html
```

## 🔬 校准与验证测试

### 收集校准样本

1. 在浏览器中运行检测
2. 完成所有检测后，点击 "导出校准样本JSON"
3. 将生成的JSON文件保存到 `docs/device-database/samples/`

### 生成校准数据

```bash
# 从样本计算阈值区间
node tools/calibrate.js ingest
```

这会生成 `docs/device-database/calibration.json`

### 验证校准结果

```bash
# 对expected.json做回归测试
node tools/calibrate.js validate
```

验证结果保存在 `docs/device-database/regression-report.json`

## ✅ 测试检查清单

### 基础功能测试
- [ ] GitHub Pages可以正常访问
- [ ] 页面加载无错误
- [ ] WASM模块成功加载
- [ ] 所有检测按钮可点击

### 功能测试
- [ ] WASM CPU检测能识别CPU架构
- [ ] WebGL检测能获取GPU信息
- [ ] WebGPU检测能获取高级特征
- [ ] 三重检测能综合识别设备
- [ ] 特征分析显示详细数据

### 数据导出测试
- [ ] 可以导出校准样本JSON
- [ ] JSON格式正确
- [ ] 校准工具能处理样本
- [ ] 验证工具能生成报告

## 🐛 常见问题

### GitHub Pages无法访问
- 检查仓库是否公开
- 确认GitHub Pages已启用（Settings → Pages）
- 等待几分钟让部署完成

### WASM模块加载失败
- 检查 `build/wasm-fingerprint.wasm` 是否存在
- 确认文件已提交到GitHub
- 检查浏览器控制台错误信息

### 检测结果不准确
- 不同浏览器可能产生不同结果
- 尝试使用Chrome/Edge获得最佳结果
- 检查设备是否支持WebGPU

### 本地测试失败
- 确认Emscripten已安装：`make check`
- 重新编译WASM：`make clean && make`
- 检查服务器是否正常运行

## 📊 测试结果示例

成功测试后，你应该看到类似以下输出：

```
🎯 最终设备识别结果:
设备型号: apple MacBook Pro M4 Pro
CPU型号: Apple Silicon
GPU型号: Apple Silicon GPU
综合置信度: 83.25%
```

## 🔗 相关链接

- **GitHub仓库**: https://github.com/1karess/wasm-fingerprint
- **在线测试**: https://1karess.github.io/wasm-fingerprint/
- **问题反馈**: 在GitHub仓库中提交Issue

