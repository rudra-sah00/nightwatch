#!/usr/bin/env bash
# scripts/resign-mac.sh — Re-sign the installed Nightwatch.app with entitlements.
#
# Usage:
#   ./scripts/resign-mac.sh                          # sign /Applications/Nightwatch.app
#   ./scripts/resign-mac.sh ./desktop-build/mac-arm64/Nightwatch.app  # sign a local build
#
# Uses the first available Apple Development identity from your Keychain.
# Falls back to ad-hoc (-) if no identity is found.

set -euo pipefail

APP="${1:-/Applications/Nightwatch.app}"
ENT="$(dirname "$0")/../electron/build/entitlements.mac.plist"

if [ ! -d "$APP" ]; then
  echo "❌ App not found: $APP"
  exit 1
fi

# Find signing identity
IDENTITY=$(security find-identity -v -p codesigning | grep "Apple Development" | head -1 | sed 's/.*"\(.*\)".*/\1/' || true)
if [ -z "$IDENTITY" ]; then
  echo "No Apple Development identity found, using ad-hoc signing"
  IDENTITY="-"
fi
echo "Signing with: $IDENTITY"

# Sign inside-out: dylibs → frameworks → helpers → main app
echo "Signing dylibs..."
for lib in "$APP/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/"*.dylib; do
  [ -f "$lib" ] && codesign --force --sign "$IDENTITY" --entitlements "$ENT" "$lib"
done

echo "Signing Electron Framework..."
codesign --force --sign "$IDENTITY" --entitlements "$ENT" \
  "$APP/Contents/Frameworks/Electron Framework.framework"

echo "Signing other frameworks..."
for fw in "$APP/Contents/Frameworks/"*.framework; do
  name=$(basename "$fw")
  [ "$name" = "Electron Framework.framework" ] && continue
  codesign --force --sign "$IDENTITY" --entitlements "$ENT" "$fw"
done

echo "Signing helper apps..."
for helper in "$APP/Contents/Frameworks/"*.app; do
  codesign --force --deep --sign "$IDENTITY" --entitlements "$ENT" "$helper"
done

echo "Signing main app..."
codesign --force --sign "$IDENTITY" --entitlements "$ENT" "$APP"

echo "Verifying..."
codesign --verify --deep --strict "$APP" 2>&1
echo "Done. $APP is properly signed."
