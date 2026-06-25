// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NativeTabs",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "NativeTabs",
            targets: ["NativeTabsPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.1")
    ],
    targets: [
        .target(
            name: "NativeTabsPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/NativeTabsPlugin"
        )
    ]
)
