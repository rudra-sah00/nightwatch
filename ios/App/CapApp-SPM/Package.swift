// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.1"),
        .package(name: "CapacitorCommunityKeepAwake", path: "../../../node_modules/.pnpm/@capacitor-community+keep-awake@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor-community/keep-awake"),
        .package(name: "CapacitorCommunityVolumeButtons", path: "../../../node_modules/.pnpm/@capacitor-community+volume-buttons@8.0.0_patch_hash=ad5f610abdf71ae165afd5083ae26afba7_92bc457206dada1fe2014cb514ace259/node_modules/@capacitor-community/volume-buttons"),
        .package(name: "CapacitorApp", path: "../../../node_modules/.pnpm/@capacitor+app@8.1.0_@capacitor+core@8.3.1/node_modules/@capacitor/app"),
        .package(name: "CapacitorClipboard", path: "../../../node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/clipboard"),
        .package(name: "CapacitorFilesystem", path: "../../../node_modules/.pnpm/@capacitor+filesystem@8.1.2_@capacitor+core@8.3.1/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorHaptics", path: "../../../node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.3.1/node_modules/@capacitor/haptics"),
        .package(name: "CapacitorKeyboard", path: "../../../node_modules/.pnpm/@capacitor+keyboard@8.0.3_@capacitor+core@8.3.1/node_modules/@capacitor/keyboard"),
        .package(name: "CapacitorNetwork", path: "../../../node_modules/.pnpm/@capacitor+network@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/network"),
        .package(name: "CapacitorPreferences", path: "../../../node_modules/.pnpm/@capacitor+preferences@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/preferences"),
        .package(name: "CapacitorScreenOrientation", path: "../../../node_modules/.pnpm/@capacitor+screen-orientation@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/screen-orientation"),
        .package(name: "CapacitorShare", path: "../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/share"),
        .package(name: "CapacitorSplashScreen", path: "../../../node_modules/.pnpm/@capacitor+splash-screen@8.0.1_@capacitor+core@8.3.1/node_modules/@capacitor/splash-screen"),
        .package(name: "CapacitorStatusBar", path: "../../../node_modules/.pnpm/@capacitor+status-bar@8.0.2_@capacitor+core@8.3.1/node_modules/@capacitor/status-bar"),
        .package(name: "CapawesomeCapacitorBadge", path: "../../../node_modules/.pnpm/@capawesome+capacitor-badge@8.0.2_@capacitor+core@8.3.1/node_modules/@capawesome/capacitor-badge"),
        .package(name: "CapgoCapacitorIncomingCallKit", path: "../../../node_modules/.pnpm/@capgo+capacitor-incoming-call-kit@8.1.1_patch_hash=4e3b122ca87f897e4c1346451a7caa655ab_fdc497a7bfb061d911c2c312b3e60ede/node_modules/@capgo/capacitor-incoming-call-kit")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityKeepAwake", package: "CapacitorCommunityKeepAwake"),
                .product(name: "CapacitorCommunityVolumeButtons", package: "CapacitorCommunityVolumeButtons"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorClipboard", package: "CapacitorClipboard"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorNetwork", package: "CapacitorNetwork"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorScreenOrientation", package: "CapacitorScreenOrientation"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "CapawesomeCapacitorBadge", package: "CapawesomeCapacitorBadge"),
                .product(name: "CapgoCapacitorIncomingCallKit", package: "CapgoCapacitorIncomingCallKit")
            ]
        )
    ]
)
