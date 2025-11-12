# Testing Guide

## GitHub Pages Online Testing (Recommended)

### Quick Access
- **Main Page**: https://1karess.github.io/wasm-fingerprint/
- **Detection Page**: https://1karess.github.io/wasm-fingerprint/enhanced-detection.html

### Testing Steps

1. **Open Detection Page**
   - Access the links above directly in your browser
   - Or redirect automatically from the main page

2. **Run Detection**
   - Click "WASM CPU Deep Analysis" - Start basic detection
   - Click "Triple Detection" - Get highest accuracy results
   - Click "Complete Feature Analysis" - View detailed technical data

3. **View Results**
   - CPU architecture identification results
   - GPU model inference
   - Overall confidence level
   - Detailed cache hierarchy analysis

### Browser Requirements

- ✅ **Chrome/Edge** (Recommended) - Full support for all features
- ✅ **Safari 17+** (macOS) - Supports WebGPU
- ✅ **Firefox** - Basic features supported
- ⚠️ **Mobile Browsers** - Some features may be limited

## Local Testing

### Method 1: Command Line Testing

```bash
# Test WASM module basic functionality
node test-wasm.js
```

**Expected Output:**
- ✅ WASM module loaded successfully
- ✅ Memory access tests passed
- ✅ Compute function tests passed
- ✅ CPU type inference results

### Method 2: Local Server

```bash
# 1. Ensure WASM is compiled
make check  # Check Emscripten
make        # Compile WASM module

# 2. Start server
make serve  # or python3 -m http.server 8080

# 3. Access test page
# http://localhost:8080/enhanced-detection.html
```

## Calibration and Validation Testing

### Collect Calibration Samples

1. Run detection in browser
2. After completing all detections, click "Export Calibration Sample JSON"
3. Save the generated JSON file to `docs/device-database/samples/`

### Generate Calibration Data

```bash
# Calculate threshold ranges from samples
node tools/calibrate.js ingest
```

This generates `docs/device-database/calibration.json`

### Validate Calibration Results

```bash
# Regression test against expected.json
node tools/calibrate.js validate
```

Validation results are saved in `docs/device-database/regression-report.json`

## Test Checklist

### Basic Functionality Tests
- [ ] GitHub Pages is accessible
- [ ] Page loads without errors
- [ ] WASM module loads successfully
- [ ] All detection buttons are clickable

### Feature Tests
- [ ] WASM CPU detection can identify CPU architecture
- [ ] WebGL detection can retrieve GPU information
- [ ] WebGPU detection can retrieve advanced features
- [ ] Triple detection can comprehensively identify devices
- [ ] Feature analysis displays detailed data

### Data Export Tests
- [ ] Can export calibration sample JSON
- [ ] JSON format is correct
- [ ] Calibration tool can process samples
- [ ] Validation tool can generate reports

## Troubleshooting

### GitHub Pages Not Accessible
- Check if repository is public
- Confirm GitHub Pages is enabled (Settings → Pages)
- Wait a few minutes for deployment to complete

### WASM Module Fails to Load
- Check if `build/wasm-fingerprint.wasm` exists
- Confirm file is committed to GitHub
- Check browser console for error messages

### Detection Results Inaccurate
- Different browsers may produce different results
- Try using Chrome/Edge for best results
- Check if device supports WebGPU

### Local Testing Fails
- Confirm Emscripten is installed: `make check`
- Recompile WASM: `make clean && make`
- Check if server is running properly

## Test Result Example

After successful testing, you should see output similar to:

```
Final Device Identification Result:
Device Model: apple MacBook Pro M4 Pro
CPU Model: Apple Silicon
GPU Model: Apple Silicon GPU
Overall Confidence: 83.25%
```

## Related Links

- **GitHub Repository**: https://github.com/1karess/wasm-fingerprint
- **Online Testing**: https://1karess.github.io/wasm-fingerprint/
- **Issue Reporting**: Submit issues in the GitHub repository




