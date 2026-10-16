#!/usr/bin/env python3
"""
Harbor Automated Performance Test Suite Runner
Executes all JMeter performance test plans, gathers latency and throughput metrics,
validates SLAs, and generates comprehensive test results.
"""

import os
import sys
import json
import time
import shutil
import urllib.request
import urllib.error
import subprocess
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TESTS_PERF_DIR = BASE_DIR / "tests" / "performance"
RESULTS_DIR = TESTS_PERF_DIR / "results"
REPORTS_DIR = TESTS_PERF_DIR / "reports"

API_HOST = os.environ.get("API_HOST", "localhost")
API_PORT = os.environ.get("API_PORT", "5000")
BASE_URL = f"http://{API_HOST}:{API_PORT}"

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)

def wait_for_gateway():
    log(f"Checking Gateway health at {BASE_URL}/health...")
    for attempt in range(1, 11):
        try:
            req = urllib.request.Request(f"{BASE_URL}/health")
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    log("Gateway is healthy!")
                    return True
        except Exception as e:
            log(f"Attempt {attempt}/10: Gateway not ready yet ({e}), retrying in 2s...")
            time.sleep(2)
    log("Error: Gateway is not accessible.")
    return False

def get_jwt_token(username, password):
    login_url = f"{BASE_URL}/api/auth/login"
    payload = json.dumps({"username": username, "password": password}).encode("utf-8")
    req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("data", {}).get("token")
            if token:
                log(f"Successfully obtained JWT for '{username}'")
                return token
            raise ValueError(f"No token in response: {data}")
    except Exception as e:
        log(f"Failed to get JWT token for '{username}': {e}")
        return None

def parse_jtl(jtl_file):
    if not jtl_file.exists():
        return None
    import csv
    with open(jtl_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        return None
    
    total = len(rows)
    successes = sum(1 for r in rows if r.get("success", "").lower() == "true")
    failures = total - successes
    error_pct = (failures / total) * 100.0 if total > 0 else 0.0
    
    elapsed_list = [float(r["elapsed"]) for r in rows if r.get("elapsed", "").replace(".", "", 1).isdigit()]
    if not elapsed_list:
        elapsed_list = [0.0]
    
    elapsed_list.sort()
    avg_latency = sum(elapsed_list) / len(elapsed_list)
    median_latency = elapsed_list[len(elapsed_list) // 2]
    min_latency = elapsed_list[0]
    max_latency = elapsed_list[-1]
    p90 = elapsed_list[int(len(elapsed_list) * 0.90)]
    p95 = elapsed_list[int(len(elapsed_list) * 0.95)]
    p99 = elapsed_list[int(len(elapsed_list) * 0.99)]
    
    timestamps = [int(r["timeStamp"]) for r in rows if r.get("timeStamp", "").isdigit()]
    if timestamps and max(timestamps) > min(timestamps):
        duration_sec = (max(timestamps) - min(timestamps)) / 1000.0
        throughput = total / duration_sec if duration_sec > 0 else total
    else:
        throughput = total / (max_latency / 1000.0) if max_latency > 0 else total
        
    return {
        "samples": total,
        "successes": successes,
        "failures": failures,
        "error_pct": error_pct,
        "avg_ms": avg_latency,
        "median_ms": median_latency,
        "min_ms": min_latency,
        "max_ms": max_latency,
        "p90_ms": p90,
        "p95_ms": p95,
        "p99_ms": p99,
        "throughput": throughput
    }

def run_jmeter_test(jmx_path, user_token, admin_token, max_allowed_error_pct=1.0):
    test_name = jmx_path.stem
    jtl_file = RESULTS_DIR / f"{test_name}.jtl"
    html_report_dir = REPORTS_DIR / test_name
    
    if jtl_file.exists():
        jtl_file.unlink()
    if html_report_dir.exists():
        shutil.rmtree(html_report_dir)
        
    log(f"Running test: {test_name} ({jmx_path.name})...")
    
    cmd = [
        "jmeter",
        "-n",
        "-t", str(jmx_path),
        "-l", str(jtl_file),
        f"-Japi_host={API_HOST}",
        f"-Japi_port={API_PORT}",
        f"-Jjwt_token={user_token}",
        f"-Jadmin_jwt_token={admin_token}",
    ]
    
    start_time = time.time()
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    duration = time.time() - start_time
    
    metrics = parse_jtl(jtl_file)
    if not metrics:
        log(f"  ❌ FAILED: No metrics generated for {test_name}. JMeter Output:\n{res.stdout}\n{res.stderr}")
        return {
            "test_name": test_name,
            "status": "FAIL",
            "error_msg": "No samples recorded",
            "duration": duration
        }
        
    passed = metrics["error_pct"] <= max_allowed_error_pct
    status = "PASS" if passed else "FAIL"
    
    log(f"  {'✅' if passed else '❌'} {test_name}: {status} | Samples: {metrics['samples']} | Errors: {metrics['error_pct']:.2f}% | Avg: {metrics['avg_ms']:.2f}ms | p95: {metrics['p95_ms']:.2f}ms | Throughput: {metrics['throughput']:.2f} req/s")
    
    return {
        "test_name": test_name,
        "file": jmx_path.name,
        "status": status,
        "metrics": metrics,
        "duration": duration
    }

def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    if not wait_for_gateway():
        sys.exit(1)
        
    user_token = get_jwt_token("qa_tester2", "Test@1234") or get_jwt_token("developer1", "ValidPassword123!")
    admin_token = get_jwt_token("admin", "Admin123!") or user_token
    
    if not user_token:
        log("Fatal: Unable to acquire authentication token.")
        sys.exit(1)

    # Discover and sort test suites
    test_files = sorted(list(TESTS_PERF_DIR.glob("*.jmx")))
    log(f"Found {len(test_files)} JMeter test plans to execute.")
    
    results = []
    for jmx in test_files:
        # AuthStressTest has 20,000 requests; set acceptable threshold to 5% under extreme saturation if needed, else 1%
        max_err = 5.0 if "Stress" in jmx.name or "Spike" in jmx.name else 1.0
        res = run_jmeter_test(jmx, user_token, admin_token, max_allowed_error_pct=max_err)
        results.append(res)
        time.sleep(1) # short cooling period between load runs
        
    # Generate summary report
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r["status"] == "PASS")
    failed_tests = total_tests - passed_tests
    
    print("\n" + "=" * 90)
    print("HARBOR PERFORMANCE TEST SUITE - SUMMARY REPORT")
    print("=" * 90)
    print(f"{'Test Case':<36} | {'Samples':<8} | {'Errors':<8} | {'Avg (ms)':<9} | {'p95 (ms)':<9} | {'Throughput':<11} | {'Status'}")
    print("-" * 90)
    
    for r in results:
        m = r.get("metrics")
        if m:
            print(f"{r['test_name']:<36} | {m['samples']:<8} | {m['error_pct']:<7.2f}% | {m['avg_ms']:<9.2f} | {m['p95_ms']:<9.2f} | {m['throughput']:<7.1f} r/s | {r['status']}")
        else:
            print(f"{r['test_name']:<36} | {'N/A':<8} | {'N/A':<8} | {'N/A':<9} | {'N/A':<9} | {'N/A':<11} | {r['status']}")
    print("=" * 90)
    print(f"Overall Result: {passed_tests}/{total_tests} PASSED ({passed_tests/total_tests*100:.1f}%)")
    print("=" * 90 + "\n")
    
    # Save JSON summary
    summary_path = RESULTS_DIR / "performance_suite_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "results": results
        }, f, indent=2)
    log(f"Performance suite summary saved to {summary_path}")
    
    if failed_tests > 0:
        log(f"⚠️ {failed_tests} performance test(s) failed.")
        sys.exit(1)
    else:
        log("🎉 All performance tests completed successfully with 100% pass rate!")
        sys.exit(0)

if __name__ == "__main__":
    main()
