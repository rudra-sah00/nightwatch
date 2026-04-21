#!/bin/bash
# Dev script: launches Tauri dev with live bridge logs saved to file
# Usage: ./scripts/tauri-dev-logs.sh
# Logs: logs/live-bridge.log (auto-created)

set -e

LOGDIR="$(dirname "$0")/../logs"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/live-bridge-$(date +%Y%m%d-%H%M%S).log"

echo "🔧 Starting Tauri dev with logging..."
echo "📄 Log file: $LOGFILE"
echo "📺 Tail logs: tail -f $LOGFILE"
echo ""

# RUST_LOG controls env_logger filtering
# watch_rudra = our crate, includes [LiveBridge], [Sniffer], [HLS], [App]
export RUST_LOG="watch_rudra_lib=debug,watch_rudra=debug"

# Run tauri dev, tee stderr (where logs go) to the log file
pnpm tauri dev 2>&1 | tee "$LOGFILE"
