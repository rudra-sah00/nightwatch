#!/bin/bash
# Ensures NightwatchViewController.swift is included in the Xcode build sources.
# Run after `npx cap sync ios` since the ios/ directory is gitignored and
# regenerated — the pbxproj won't have our custom file reference.

PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"

if [ ! -f "$PBXPROJ" ]; then
  echo "⚠ $PBXPROJ not found — skipping"
  exit 0
fi

if grep -q "NightwatchViewController" "$PBXPROJ"; then
  echo "✓ NightwatchViewController already in Xcode project"
  exit 0
fi

python3 -c "
pbx = '$PBXPROJ'
with open(pbx, 'r') as f:
    content = f.read()

fid = 'A1B2C3D41FED79650016851F'
bid = 'A1B2C3D51FED79650016851F'

ref = fid + ' /* NightwatchViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NightwatchViewController.swift; sourceTree = \"<group>\"; };'
build = bid + ' /* NightwatchViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ' + fid + ' /* NightwatchViewController.swift */; };'

content = content.replace(
    '504EC3071FED79650016851F /* AppDelegate.swift */',
    '504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t' + fid + ' /* NightwatchViewController.swift */',
    1
)
content = content.replace(
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */',
    '504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t' + bid + ' /* NightwatchViewController.swift in Sources */',
    1
)

# Add file reference declaration (after AppDelegate's file ref)
anchor = '504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference;'
idx = content.find(anchor)
if idx != -1:
    end = content.find(';', idx) + 1
    content = content[:end+1] + '\n\t\t' + ref + content[end+1:]

# Add build file declaration (after AppDelegate's build file)
anchor2 = '504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile;'
idx2 = content.find(anchor2)
if idx2 != -1:
    end2 = content.find(';', idx2) + 1
    content = content[:end2+1] + '\n\t\t' + build + content[end2+1:]

with open(pbx, 'w') as f:
    f.write(content)

print('✓ Added NightwatchViewController.swift to Xcode project')
"
