import Foundation
import Capacitor
import UIKit

/**
 * LiquidGlass — renders one or more native Apple glass surfaces around the
 * WebView. Each surface is keyed by an `id` so multiple pills can be tracked
 * independently (e.g. outer tab-bar pill + inner sliding active pill).
 *
 *   iOS 26+ → UIGlassEffect (real Liquid Glass).
 *   iOS 17–25 → UIVisualEffectView with .systemUltraThinMaterial (fallback).
 *
 * A surface can render above the WebView and receive transparent exclusion
 * holes for labels/icons, keeping text crisp while the rest is real native
 * Apple glass.
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
            let id = call.getString("id") ?? "default"
            let frame = self.frame(from: call)
            let radius = CGFloat(call.getDouble("cornerRadius") ?? 28.0)
            let intensity = CGFloat(call.getDouble("intensity") ?? 1.0)
            let placement = call.getString("placement") ?? "behind"
            let exclusions = self.exclusionFrames(from: call)

            if let existing = self.glassViews[id] {
                existing.frame = frame
                existing.layer.cornerRadius = radius
                existing.layer.cornerCurve = .continuous
                existing.alpha = max(0, min(1, intensity))
                self.applyMask(to: existing, frame: frame, cornerRadius: radius, exclusionFrames: exclusions)
            } else {
                let view = self.makeGlassView(frame: frame, cornerRadius: radius)
                view.alpha = max(0, min(1, intensity))
                view.isUserInteractionEnabled = false
                self.applyMask(to: view, frame: frame, cornerRadius: radius, exclusionFrames: exclusions)
                self.glassViews[id] = view
                if let webView = self.bridge?.webView, let parent = webView.superview {
                    if placement == "above" {
                        parent.insertSubview(view, aboveSubview: webView)
                    } else {
                        self.ensureWebViewTransparent()
                        parent.insertSubview(view, belowSubview: webView)
                    }
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
            let exclusions = self.exclusionFrames(from: call)
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            gv.frame = frame
            gv.layer.cornerRadius = radius
            gv.layer.cornerCurve = .continuous
            if let i = intensity { gv.alpha = max(0, min(1, i)) }
            self.applyMask(to: gv, frame: frame, cornerRadius: radius, exclusionFrames: exclusions)
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

    private func frame(from object: JSObject) -> CGRect? {
        guard
            let x = object["x"] as? Double,
            let y = object["y"] as? Double,
            let w = object["width"] as? Double,
            let h = object["height"] as? Double,
            let webView = self.bridge?.webView
        else { return nil }
        let local = CGRect(x: CGFloat(x), y: CGFloat(y), width: CGFloat(w), height: CGFloat(h))
        return webView.convert(local, to: webView.superview)
    }

    private func exclusionFrames(from call: CAPPluginCall) -> [(rect: CGRect, radius: CGFloat)] {
        let items = call.getArray("exclusionRects", JSObject.self) ?? []
        return items.compactMap { item in
            guard let rect = self.frame(from: item) else { return nil }
            let radius = CGFloat((item["cornerRadius"] as? Double) ?? Double(min(rect.width, rect.height) / 2))
            return (rect, radius)
        }
    }

    private func applyMask(to view: UIView, frame: CGRect, cornerRadius: CGFloat, exclusionFrames: [(rect: CGRect, radius: CGFloat)]) {
        guard !exclusionFrames.isEmpty else {
            view.layer.mask = nil
            return
        }

        let path = UIBezierPath(roundedRect: view.bounds, cornerRadius: cornerRadius)
        for item in exclusionFrames {
            let local = item.rect.offsetBy(dx: -frame.minX, dy: -frame.minY).insetBy(dx: -7, dy: -5)
            guard local.intersects(view.bounds) else { continue }
            path.append(UIBezierPath(roundedRect: local, cornerRadius: item.radius + 6))
        }

        let mask = CAShapeLayer()
        mask.frame = view.bounds
        mask.path = path.cgPath
        mask.fillRule = .evenOdd
        view.layer.mask = mask
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
