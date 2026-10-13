#!/usr/bin/env bash
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="$PATH:$HOME/.dotnet/tools"

# Ensure reportgenerator is available
if ! command -v reportgenerator &> /dev/null; then
    echo "Installing dotnet-reportgenerator-globaltool..."
    dotnet tool install -g dotnet-reportgenerator-globaltool || true
fi

RESULTS_DIR="$REPO_ROOT/TestResults"
REPORT_DIR="$RESULTS_DIR/CoverageReport"

echo "=========================================================="
echo "  Harbor Code Coverage & Branch Coverage Tool (Coverlet)   "
echo "=========================================================="

MODE="all"
if [[ "$1" == "--unit-only" ]]; then
    MODE="unit"
fi

# Clean previous results
rm -rf "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR"

UNIT_PROJECTS=(
    "tests/unit/Harbor.Common.Tests/Harbor.Common.Tests.csproj"
    "tests/unit/Harbor.GitHub.Tests/Harbor.GitHub.Tests.csproj"
    "tests/unit/Harbor.Environment.Tests/Harbor.Environment.Tests.csproj"
    "tests/unit/Harbor.Authentication.Tests/Harbor.Authentication.Tests.csproj"
    "tests/unit/Harbor.Deployment.Tests/Harbor.Deployment.Tests.csproj"
    "tests/unit/Harbor.Project.Tests/Harbor.Project.Tests.csproj"
    "tests/unit/Harbor.Reporting.Tests/Harbor.Reporting.Tests.csproj"
)

INTEGRATION_PROJECTS=(
    "tests/integration/Harbor.Observability.IntegrationTests/Harbor.Observability.IntegrationTests.csproj"
    "tests/integration/Harbor.Deployment.IntegrationTests/Harbor.Deployment.IntegrationTests.csproj"
    "tests/integration/Harbor.Authentication.IntegrationTests/Harbor.Authentication.IntegrationTests.csproj"
    "tests/integration/Harbor.Project.IntegrationTests/Harbor.Project.IntegrationTests.csproj"
    "tests/integration/Harbor.Environment.IntegrationTests/Harbor.Environment.IntegrationTests.csproj"
)

run_test_project() {
    local proj="$1"
    local proj_name
    proj_name="$(basename "$proj" .csproj)"
    echo -e "\n▶ Running tests with Coverlet for: $proj_name"
    dotnet test "$proj" \
        --configuration Debug \
        --settings coverlet.runsettings \
        --collect:"XPlat Code Coverage" \
        --results-directory "$RESULTS_DIR" \
        --verbosity minimal || echo "⚠️  $proj_name had test failures"
}

echo -e "\n--- Running Unit Tests ---"
for proj in "${UNIT_PROJECTS[@]}"; do
    run_test_project "$proj"
done

if [[ "$MODE" == "all" ]]; then
    echo -e "\n--- Running Integration Tests ---"
    for proj in "${INTEGRATION_PROJECTS[@]}"; do
        run_test_project "$proj"
    done
fi

echo -e "\n=========================================================="
echo "  Aggregating Code & Branch Coverage with ReportGenerator  "
echo "=========================================================="

reportgenerator \
    -reports:"$RESULTS_DIR/**/coverage.cobertura.xml" \
    -targetdir:"$REPORT_DIR" \
    -reporttypes:"TextSummary;Html;MarkdownSummaryGithub;JsonSummary" \
    -assemblyfilters:"+Harbor.*;-Harbor.*Tests*" \
    -title:"Harbor Code Coverage Report"

echo -e "\n=========================================================="
echo "                  COVERAGE SUMMARY                        "
echo "=========================================================="
cat "$REPORT_DIR/Summary.txt"

echo -e "\n=========================================================="
echo "  HTML Report: $REPORT_DIR/index.html"
echo "  Markdown Summary: $REPORT_DIR/SummaryGithub.md"
echo "=========================================================="
