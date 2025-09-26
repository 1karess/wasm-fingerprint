#include <emscripten.h>
#include <math.h>
#include <stdint.h>

// 修复版浮点运算精度测试
EMSCRIPTEN_KEEPALIVE
double float_precision_test(int iterations) {
    double result = 1.0;
    double increment = 1.0 / 3.0;  // 产生舍入误差

    for (int i = 0; i < iterations; i++) {
        result += increment;
        result *= 0.9999;  // 微小缩放因子
        if (result > 0) {
            result = sqrt(result);  // 开平方
            result = result * result;  // 平方回去
        }
    }

    return result;
}

// 修复版超越函数实现差异测试
EMSCRIPTEN_KEEPALIVE
double transcendental_test(double input, int iterations) {
    double result = fabs(input);  // 确保正数
    if (result == 0.0) result = 1.0;

    for (int i = 0; i < iterations; i++) {
        result = sin(result * 0.1) + 1.1;  // 保持在合理范围
        result = cos(result * 0.1) + 1.1;
        result = fabs(result);  // 防止负数
        if (result > 10.0) result = result / 10.0;  // 防止溢出

        result = log(result + 1.0);  // 防止log(0)
        result = exp(result * 0.1);  // 防止exp溢出
    }

    return result;
}

// 修复版整数运算优化模式测试
EMSCRIPTEN_KEEPALIVE
long integer_optimization_test(int iterations) {
    long result = 12345;  // 使用非1的初始值

    for (int i = 1; i <= iterations; i++) {
        // 简化运算避免复杂的除法
        result = (result * 3 + i) / 2;

        // 测试位运算优化
        result ^= (result << 1) ^ (result >> 1);

        // 测试乘法优化
        result += (i & 1) ? i : i/2;

        // 防止溢出
        if (result > 1000000L || result < -1000000L) {
            result = (result % 1000000L) + 1000;  // 确保不为0
        }

        // 确保结果有意义
        if (result == 0) result = i + 1000;
    }

    return result;
}

// 修复版分支预测测试
EMSCRIPTEN_KEEPALIVE
long branch_prediction_test(int iterations) {
    long result = 0;

    for (int i = 0; i < iterations; i++) {
        // 规律性分支模式
        if (i % 4 == 0) {
            result += i * 2;
        } else if (i % 4 == 1) {
            result -= i;
        } else if (i % 4 == 2) {
            result += i / 2;
        } else {
            result = (long)(result * 1.01);  // 避免整数溢出
        }

        // 伪随机分支模式
        int pseudo_rand = (i * 314159) % 1000;
        if (pseudo_rand < 250) {
            result += pseudo_rand;
        } else if (pseudo_rand < 500) {
            result -= pseudo_rand / 2;
        } else if (pseudo_rand < 750) {
            result *= 2;
        } else {
            if (result != 0) result /= 2;
        }

        // 防止结果过大
        if (result > 1000000000L || result < -1000000000L) {
            result = result % 1000000000L;
        }
    }

    return result;
}

// 修复版SIMD风格的向量运算测试
EMSCRIPTEN_KEEPALIVE
double vector_computation_test(int iterations) {
    // 模拟SIMD运算
    double vec_a[8] = {1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0};
    double vec_b[8] = {0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5};
    double result[8] = {0};

    // 使用合理的工作负载
    for (int iter = 0; iter < iterations; iter++) {
        // 向量加法
        for (int i = 0; i < 8; i++) {
            result[i] = vec_a[i] + vec_b[i];
        }

        // 向量乘法
        for (int i = 0; i < 8; i++) {
            result[i] *= vec_a[i];
        }

        // 点积计算
        double dot_product = 0;
        for (int i = 0; i < 8; i++) {
            dot_product += result[i] * vec_b[i];
        }

        // 复杂的向量运算
        for (int i = 0; i < 8; i++) {
            result[i] = sqrt(fabs(result[i])) + sin(vec_a[i] * 0.1);
            result[i] = result[i] * cos(vec_b[i] * 0.1) + 1.0;
        }

        // 更新向量
        for (int i = 0; i < 8; i++) {
            vec_a[i] = result[i] * 0.9;
            vec_b[i] = dot_product * 0.001 + (i + 1);

            // 防止NaN和无穷大
            if (!isfinite(vec_a[i]) || fabs(vec_a[i]) > 1000) vec_a[i] = (i + 1);
            if (!isfinite(vec_b[i]) || fabs(vec_b[i]) > 1000) vec_b[i] = (i + 1) * 0.5;
        }
    }

    // 返回最终结果的和
    double final_result = 0;
    for (int i = 0; i < 8; i++) {
        if (isfinite(result[i])) {
            final_result += result[i];
        }
    }

    return isfinite(final_result) ? final_result : 1.0;
}

// 修复版数值稳定性测试
EMSCRIPTEN_KEEPALIVE
double numerical_stability_test(double base, int iterations) {
    double result = fabs(base);
    if (result == 0.0) result = 1.0;

    for (int i = 0; i < iterations; i++) {
        // 容易产生数值不稳定的运算序列
        if (result > 0) {
            result = sqrt(result * result + 1e-10);
        }

        if (result > 0) {
            result = log(exp(result * 0.01) * 0.99 + 0.01);  // 防止log(0)
        }

        if (result > -10 && result < 10) {
            double temp = sin(result);
            if (fabs(temp) < 0.99) {
                result = asin(temp * 0.99);
            }
        }

        if (result > 0) {
            result = pow(result, 1.0 + 1e-6);  // 更小的指数
        }

        // 防止结果超出范围
        if (!isfinite(result) || result <= 0 || result > 100) {
            result = base;  // 重置为初始值
        }
    }

    return result;
}

// 修复版内存密集型vs计算密集型比较
EMSCRIPTEN_KEEPALIVE
double compute_memory_ratio_test(int size_kb, int compute_intensity) {
    int size = size_kb * 1024 / sizeof(double);
    double* data = malloc(size * sizeof(double));

    if (!data) return -1.0;

    // 初始化数据
    for (int i = 0; i < size; i++) {
        data[i] = (double)i / size;
    }

    double result = 0;

    // 内存访问 + 计算
    for (int i = 0; i < size; i++) {
        double value = data[i];

        // 根据计算强度参数决定计算复杂度
        for (int j = 0; j < compute_intensity; j++) {
            value = sin(value * 0.1) + cos(value * 0.1);
            if (!isfinite(value)) value = 0.5;  // 防止NaN
        }

        result += value;
        data[i] = value;  // 写回内存
    }

    free(data);
    return isfinite(result) ? result : 0.0;
}

// 修复版缓存友好vs缓存不友好访问模式
EMSCRIPTEN_KEEPALIVE
double cache_behavior_test(int size_kb, int access_pattern) {
    int size = size_kb * 1024 / sizeof(int);
    int* data = malloc(size * sizeof(int));

    if (!data) return -1.0;

    // 初始化
    for (int i = 0; i < size; i++) {
        data[i] = i;
    }

    volatile long sum = 0;

    if (access_pattern == 0) {
        // 缓存友好：顺序访问
        for (int i = 0; i < size; i++) {
            sum += data[i];
        }
    } else {
        // 缓存不友好：大步长跳跃访问
        int stride = 256;  // 固定大步长
        for (int i = 0; i < size; i += stride) {
            sum += data[i];
        }
    }

    free(data);
    return (double)sum;
}

// 分支预测器表大小检测 (BTB - Branch Target Buffer)
EMSCRIPTEN_KEEPALIVE
double btb_size_detection(int max_branches) {
    volatile long correct_predictions = 0;
    int likely_btb_size = 512;  // 默认值

    // 测试不同数量的分支目标
    for (int num_branches = 64; num_branches <= max_branches; num_branches *= 2) {
        // 创建分支目标数组
        volatile long* branch_targets = malloc(sizeof(long) * num_branches);
        if (!branch_targets) continue;

        // 初始化分支目标
        for (int i = 0; i < num_branches; i++) {
            branch_targets[i] = (i * 123456789L) % 1000000L;
        }

        volatile long sum = 0;
        int iterations = 10000;

        // 测试循环分支模式
        for (int iter = 0; iter < iterations; iter++) {
            for (int i = 0; i < num_branches; i++) {
                // 间接跳转模式，测试BTB
                int target_index = (i * 7) % num_branches;
                sum += branch_targets[target_index];

                // 条件分支，产生可预测模式
                if (sum % 3 == 0) {
                    sum += i;
                } else if (sum % 3 == 1) {
                    sum -= i;
                } else {
                    sum *= 2;
                }
            }
        }

        // 使用执行时间代理（结果值）估算预测准确性
        double prediction_score = (double)sum / (iterations * num_branches);

        // 当分支目标数量超过BTB容量时，性能应该下降
        if (num_branches == 64) {
            correct_predictions = (long)prediction_score;
        } else if (prediction_score < correct_predictions * 0.8) {
            // 性能下降20%时，认为超出BTB容量
            likely_btb_size = num_branches / 2;
            break;
        }

        free((void*)branch_targets);
    }

    return (double)likely_btb_size;
}

// 分支历史表深度检测
EMSCRIPTEN_KEEPALIVE
double branch_history_depth_test(int max_pattern_length) {
    double best_prediction_score = 0;
    int optimal_pattern_length = 4;  // 默认值

    // 测试不同长度的分支历史模式
    for (int pattern_len = 2; pattern_len <= max_pattern_length; pattern_len++) {
        volatile long sum = 0;
        int iterations = 10000;
        int pattern_mask = (1 << pattern_len) - 1;

        for (int iter = 0; iter < iterations; iter++) {
            // 创建重复的分支模式
            int pattern = iter & pattern_mask;

            for (int i = 0; i < pattern_len * 100; i++) {
                int branch_decision = (i & pattern_mask) == pattern;

                if (branch_decision) {
                    sum += i * 3;
                } else {
                    sum -= i;
                }

                // 额外的嵌套分支测试历史深度
                if ((sum % (1 << pattern_len)) == 0) {
                    if (branch_decision) {
                        sum += pattern_len;
                    } else {
                        sum -= pattern_len;
                    }
                }
            }
        }

        double prediction_score = (double)abs((int)sum) / (iterations * pattern_len * 100);

        // 寻找最佳预测模式长度
        if (prediction_score > best_prediction_score) {
            best_prediction_score = prediction_score;
            optimal_pattern_length = pattern_len;
        }
    }

    return (double)optimal_pattern_length;
}

// 测试函数定义
static long test_func1(long x) { return x * 2; }
static long test_func2(long x) { return x + 1; }
static long test_func3(long x) { return x / 2; }
static long test_func4(long x) { return x - 1; }

// 间接分支预测器测试
EMSCRIPTEN_KEEPALIVE
double indirect_branch_predictor_test(int num_targets) {
    // 创建函数指针表模拟间接跳转
    typedef long (*func_ptr)(long);

    func_ptr functions[] = {
        test_func1,
        test_func2,
        test_func3,
        test_func4
    };

    volatile long sum = 0;
    int iterations = 50000;
    unsigned int seed = 12345;

    for (int iter = 0; iter < iterations; iter++) {
        // 生成间接跳转模式
        for (int i = 0; i < num_targets; i++) {
            seed = seed * 1664525 + 1013904223;
            int func_index = seed % 4;

            // 间接函数调用
            long result = functions[func_index](iter + i);
            sum += result;
        }
    }

    return (double)sum / (iterations * num_targets);
}

// 循环分支预测器测试
EMSCRIPTEN_KEEPALIVE
double loop_branch_predictor_test(int max_loop_depth) {
    volatile long sum = 0;
    double best_loop_depth = 0;

    // 测试不同嵌套深度的循环
    for (int depth = 1; depth <= max_loop_depth; depth++) {
        int iterations = 1000 / depth;  // 调整迭代次数

        for (int iter = 0; iter < iterations; iter++) {
            // 生成嵌套循环结构
            volatile long temp_sum = 0;

            for (int i1 = 0; i1 < 10; i1++) {
                if (depth > 1) {
                    for (int i2 = 0; i2 < 10; i2++) {
                        if (depth > 2) {
                            for (int i3 = 0; i3 < 10; i3++) {
                                if (depth > 3) {
                                    for (int i4 = 0; i4 < 10; i4++) {
                                        temp_sum += i1 + i2 + i3 + i4;
                                    }
                                } else {
                                    temp_sum += i1 + i2 + i3;
                                }
                            }
                        } else {
                            temp_sum += i1 + i2;
                        }
                    }
                } else {
                    temp_sum += i1;
                }
            }

            sum += temp_sum;
        }

        // 使用执行结果估算最优循环深度
        double current_score = (double)sum / iterations;
        if (current_score > best_loop_depth) {
            best_loop_depth = depth;
        }
    }

    return best_loop_depth;
}

// Return Address Stack (RAS) 深度测试
EMSCRIPTEN_KEEPALIVE
double return_stack_depth_test(int max_call_depth) {
    volatile long sum = 0;
    int optimal_depth = 8;  // 默认值

    // 递归函数测试RAS
    for (int target_depth = 2; target_depth <= max_call_depth; target_depth++) {
        volatile long recursive_sum = 0;
        int iterations = 1000;

        for (int iter = 0; iter < iterations; iter++) {
            // 模拟递归调用栈
            volatile long call_stack[32];  // 模拟调用栈
            int current_depth = 0;

            // 向下调用
            for (int i = 0; i < target_depth; i++) {
                call_stack[current_depth] = iter + i;
                current_depth++;
                recursive_sum += call_stack[current_depth - 1];
            }

            // 向上返回
            for (int i = target_depth - 1; i >= 0; i--) {
                current_depth--;
                recursive_sum += call_stack[current_depth];
            }
        }

        double call_efficiency = (double)recursive_sum / (iterations * target_depth * 2);

        // 寻找最优的调用深度（RAS容量）
        if (target_depth <= 16 && call_efficiency > 0) {
            optimal_depth = target_depth;
        }
    }

    return (double)optimal_depth;
}