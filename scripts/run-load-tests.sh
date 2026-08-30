#!/bin/bash

echo "🚀 Starting JMeter Load Test..."

# Clean up old reports
echo "🧹 Cleaning up old test results..."
rm -f tests/performance/results.jtl
rm -rf tests/performance/html-report

# Run the test
echo "🔥 Blasting API with requests..."
~/apache-jmeter-5.6.3/bin/jmeter -n -t tests/performance/Harbor-Auth-LoadTest.jmx -l tests/performance/results.jtl -e -o tests/performance/html-report

echo ""
echo "✅ Load test complete!"
echo "📊 If you have a local web server running on port 8080, view the dashboard here:"
echo "👉 http://localhost:8080"
