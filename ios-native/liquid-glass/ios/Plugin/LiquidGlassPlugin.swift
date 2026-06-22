import Foundation
import Capacitor
import UIKit

/**
 * LiquidGlass — renders a native Apple glass surface beneath the WebView
 * region of the bottom nav pill.
 *
 *   iOS 26+ → UIGlassEffect (real Liquid Glass).
 *   iOS 17–25 → UIVisualEffectView with .systemUltraThinMaterial (fallback).
 *
 * The WebView is made transparent on first use so the native glass is
 * visible behind the HTML content (icons/labels stay in React).
 */
@objc(LiquidGlassPlugin)
public class LiquidGlassPlugin: CAPPlugin {

    private var glassView: UIView?
    private var didMakeWebViewTransparent = false

    // MARK: - JS API

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.ensureWebViewTransparent()
            let frame = self.frame(from: call)
            let radius = CGFloat(call.getDouble("cornerRadius") ?? 28.0)

            if self.glassView == nil {
                self.glassView = self.makeGlassView(frame: frame, cornerRadius: radius)
                if let gv = self.glassView, let webView = self.bridge?.webView, let parent = webView.superview {
                    // Insert BEHIND the WebView so HTML icons render on top.
                    parent.insertSubview(gv, belowSubview: webView)
                }
            } else {
                self.glassView?.frame = frame
                self.applyCornerRadius(radius)
            }
            call.resolve()
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let gv = self.glassView else { call.resolve(); return }
            let frame = self.frame(from: call)
            let radius = CGFloat(call.getDouble("cornerRadius") ?? Double(gv.layer.cornerRadius))
            // Pixel-perfect tracking: disable implicit Core Animation so the
            // glass jumps to the exact frame the JS rAF computed this tick.
            // The JS side already drives smooth 60/120fps updates.
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            gv.frame = frame
            gv.layer.cornerRadius = radius
            gv.layer.cornerCurve = .continuous
            CATransaction.commit()
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.glassView?.removeFromSuperview()
            self.glassView = nil
            call.resolve()
        }
    }

    // MARK: - Helpers

    private func frame(from call: CAPPluginCall) -> CGRect {
        // JS sends CSS pixels; UIKit uses points. On iOS they're 1:1 for the
        // WebView's coordinate space (WKWebView already accounts for scale).
        let x = CGFloat(call.getDouble("x") ?? 0)
        let y = CGFloat(call.getDouble("y") ?? 0)
        let w = CGFloat(call.getDouble("width") ?? 0)
        let h = CGFloat(call.getDouble("height") ?? 0)
        guard let webView = self.bridge?.webView else {
            return CGRect(x: x, y: y, width: w, height: h)
        }
        // Translate from WebView-local coords to its superview's coords.
        let local = CGRect(x: x, y: y, width: w, height: h)
        return webView.convert(local, to: webView.superview)
    }

    private func makeGlassView(frame: CGRect, cornerRadius: CGFloat) -> UIView {
        // iOS 26+ Liquid Glass
        if #available(iOS 26.0, *) {
            // UIGlassEffect ships as a UIVisualEffect subclass in iOS 26.
            // We use it via UIVisualEffectView so the rest of the code is identical.
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
        // Fallback: classic system material (Control Center-style)
        let blur = UIBlurEffect(style: .systemUltraThinMaterial)
        let view = UIVisualEffectView(effect: blur)
        view.frame = frame
        view.layer.cornerRadius = cornerRadius
        view.layer.cornerCurve = .continuous
        view.clipsToBounds = true
        // Subtle hairline to match Apple's pill chrome
        view.layer.borderWidth = 1.0 / UIScreen.main.scale
        view.layer.borderColor = UIColor(white: 1.0, alpha: 0.12).cgColor
        return view
    }

    private func applyCornerRadius(_ radius: CGFloat) {
        guard let gv = self.glassView else { return }
        gv.layer.cornerRadius = radius
        gv.layer.cornerCurve = .continuous
    }

    /// Make the WKWebView and its scroll view transparent so the native
    /// glass surface behind it is visible. Called lazily on first show().
    private func ensureWebViewTransparent() {
        guard !didMakeWebViewTransparent, let webView = self.bridge?.webView else { return }
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        didMakeWebViewTransparent = true
    }
}
