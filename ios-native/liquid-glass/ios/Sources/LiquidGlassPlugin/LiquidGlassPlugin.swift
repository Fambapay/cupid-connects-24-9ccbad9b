import Foundation
import Capacitor
import UIKit

/**
 * LiquidGlass — renders one or more native Apple glass surfaces beneath the
 * WebView. Each surface is keyed by an `id` so multiple pills can be tracked
 * independently (e.g. outer tab-bar pill + inner sliding active pill).
 *
 *   iOS 26+ → UIGlassEffect (real Liquid Glass).
 *   iOS 17–25 → UIVisualEffectView with .systemUltraThinMaterial (fallback).
 *
 * The WebView is made transparent on first use so the native glass is
 * visible behind the HTML content (icons/labels stay in React).
 */
@objc(LiquidGlassPlugin)
public class LiquidGlassPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiquidGlassPlugin"
    public let jsName = "LiquidGlass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide",   returnType: CAPPluginReturnPromise),
    ]

    private var glassViews: [String: UIView] = [:]
    private var didMakeWebViewTransparent = false

    // MARK: - JS API

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.ensureWebViewTransparent()
            let id = call.getString("id") ?? "default"
            let frame = self.frame(from: call)
            let radius = CGFloat(call.getDouble("cornerRadius") ?? 28.0)
            let intensity = CGFloat(call.getDouble("intensity") ?? 1.0)

            if let existing = self.glassViews[id] {
                existing.frame = frame
                existing.layer.cornerRadius = radius
                existing.layer.cornerCurve = .continuous
                existing.alpha = max(0, min(1, intensity))
            } else {
                let view = self.makeGlassView(frame: frame, cornerRadius: radius)
                view.alpha = max(0, min(1, intensity))
                self.glassViews[id] = view
                if let webView = self.bridge?.webView, let parent = webView.superview {
                    // All glass surfaces render BEHIND the WebView so HTML
                    // icons/labels stay perfectly crisp on top of the native
                    // refraction (the WebView is transparent over the nav).
                    parent.insertSubview(view, belowSubview: webView)
                }
            }
            call.resolve()
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let id = call.getString("id") ?? "default"
            guard let gv = self.glassViews[id] else { call.resolve(); return }
            let frame = self.frame(from: call)
            let radius = CGFloat(call.getDouble("cornerRadius") ?? Double(gv.layer.cornerRadius))
            let intensity = call.getDouble("intensity").map { CGFloat($0) }
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            gv.frame = frame
            gv.layer.cornerRadius = radius
            gv.layer.cornerCurve = .continuous
            if let i = intensity { gv.alpha = max(0, min(1, i)) }
            CATransaction.commit()
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let id = call.getString("id") ?? "default"
            self.glassViews[id]?.removeFromSuperview()
            self.glassViews.removeValue(forKey: id)
            call.resolve()
        }
    }

    // MARK: - Helpers

    private func frame(from call: CAPPluginCall) -> CGRect {
        let x = CGFloat(call.getDouble("x") ?? 0)
        let y = CGFloat(call.getDouble("y") ?? 0)
        let w = CGFloat(call.getDouble("width") ?? 0)
        let h = CGFloat(call.getDouble("height") ?? 0)
        guard let webView = self.bridge?.webView else {
            return CGRect(x: x, y: y, width: w, height: h)
        }
        let local = CGRect(x: x, y: y, width: w, height: h)
        return webView.convert(local, to: webView.superview)
    }

    private func makeGlassView(frame: CGRect, cornerRadius: CGFloat) -> UIView {
        if #available(iOS 26.0, *) {
            if let glassEffectClass = NSClassFromString("UIGlassEffect") as? UIVisualEffect.Type {
                let effect = glassEffectClass.init()
                let view = UIVisualEffectView(effect: effect)
                view.frame = frame
                view.layer.cornerRadius = cornerRadius
                view.layer.cornerCurve = .continuous
                view.clipsToBounds = true
                return view
            }
        }
        let blur = UIBlurEffect(style: .systemUltraThinMaterial)
        let view = UIVisualEffectView(effect: blur)
        view.frame = frame
        view.layer.cornerRadius = cornerRadius
        view.layer.cornerCurve = .continuous
        view.clipsToBounds = true
        view.layer.borderWidth = 1.0 / UIScreen.main.scale
        view.layer.borderColor = UIColor(white: 1.0, alpha: 0.18).cgColor
        return view
    }

    private func ensureWebViewTransparent() {
        guard !didMakeWebViewTransparent, let webView = self.bridge?.webView else { return }
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        didMakeWebViewTransparent = true
    }
}
