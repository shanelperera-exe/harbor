#!/usr/bin/env bash
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="$PATH:$HOME/.dotnet/tools"

# Colors for terminal output
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}==========================================================${RESET}"
echo -e "${BOLD}${CYAN}  Harbor Microservice Mutation Testing (Stryker.NET)     ${RESET}"
echo -e "${BOLD}${CYAN}==========================================================${RESET}"

# Ensure dotnet-stryker is installed
if ! command -v dotnet-stryker &> /dev/null; then
    echo -e "${YELLOW}Installing dotnet-stryker global tool...${RESET}"
    dotnet tool install -g dotnet-stryker || true
fi

MODE="fast"
OPEN_BROWSER=false

for arg in "$@"; do
    case "$arg" in
        --fast)
            MODE="fast"
            ;;
        --all)
            MODE="all"
            ;;
        --open)
            OPEN_BROWSER=true
            ;;
        --help|-h)
            echo "Usage: ./scripts/run-mutation-tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fast         Run fast targeted mutation testing suite for live demo (default)"
            echo "  --all          Run full mutation testing suite on domain services"
            echo "  --open         Automatically open HTML mutation report in browser"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
    esac
done

TEST_DIR="$REPO_ROOT/tests/unit/Harbor.Deployment.Tests"
cd "$TEST_DIR"

if [[ "$MODE" == "fast" ]]; then
    echo -e "${CYAN}▶ Mode: Fast Live-Demo Run${RESET}"
    echo -e "${CYAN}  Target: Harbor.Deployment (DeploymentUrlExtractor.cs, DeploymentLogSanitizer.cs)${RESET}"
    dotnet stryker \
        -p Harbor.Deployment.csproj \
        -m "**/DeploymentUrlExtractor.cs" \
        -m "**/DeploymentLogSanitizer.cs" \
        -r ClearText -r Html
else
    echo -e "${CYAN}▶ Mode: Full Domain Mutation Run${RESET}"
    echo -e "${CYAN}  Target: Harbor.Deployment Core Domain & Services${RESET}"
    dotnet stryker \
        -p Harbor.Deployment.csproj \
        -m "Services/*.cs" \
        -r ClearText -r Html
fi

# Locate the latest generated HTML mutation report
LATEST_REPORT=$(find "$TEST_DIR/StrykerOutput" -name "mutation-report.html" 2>/dev/null | sort -r | head -n 1 || true)

echo -e "\n${BOLD}${GREEN}==========================================================${RESET}"
echo -e "${BOLD}${GREEN}            MUTATION TESTING COMPLETED SUCCESSFULLY       ${RESET}"
echo -e "${BOLD}${GREEN}==========================================================${RESET}"

if [[ -n "$LATEST_REPORT" && -f "$LATEST_REPORT" ]]; then
    echo -e "${BOLD}HTML Report:${RESET} ${LATEST_REPORT}"
    
    open_report() {
        echo -e "\n${CYAN}🌐 Opening mutation report in your browser...${RESET}"
        if grep -qi microsoft /proc/version 2>/dev/null && command -v powershell.exe &> /dev/null && command -v wslpath &> /dev/null; then
            local win_path
            win_path="$(wslpath -w "$LATEST_REPORT")"
            powershell.exe -NoProfile -Command "Start-Process '$win_path'" &> /dev/null &
        elif command -v wslview &> /dev/null; then
            wslview "$LATEST_REPORT" &> /dev/null &
        elif command -v open &> /dev/null; then
            open "$LATEST_REPORT" &> /dev/null &
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$LATEST_REPORT" &> /dev/null &
        else
            echo "Please open the report manually in your browser: $LATEST_REPORT"
        fi
    }

    if [[ "$OPEN_BROWSER" == true ]]; then
        open_report
    fi
fi
