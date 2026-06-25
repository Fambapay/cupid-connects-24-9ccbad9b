// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LiquidGlass",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "LiquidGlass",
            targets: ["LiquidGlassPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "LiquidGlassPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/LiquidGlassPlugin")
    ]
)
