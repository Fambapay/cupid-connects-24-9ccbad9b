import Foundation
import UIKit
import Capacitor

/**
 * LiquidGlassPlugin
 *
 * Renders Apple's native glass material as an overlay on top of the WebView,
 * positioned to match the JS-side bottom-nav pill. On iOS 26+ it uses
 * `UIGlassEffect` (Liquid Glass); on iOS 15–25 it falls back to the closest
 * system material (`.systemUltraThinMaterial`) which is the canonical
 * "frosted glass" look used by Control Center / the Dynamic Island shelf.
 *
 * The web pill is rendered fully transparent (`.tab-bar-pill--native`) so
 * the icons and active dot still appear above this overlay through the
 * WebView's pointer events — we keep `isUserInteractionEnabled = false` so
 * taps pass straight through to the WebView.
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

    private var container: UIView?
    private var glass: UIVisualEffectView?
    private var highlight: CAGradientLayer?

    // MARK: - Public methods

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.ensureLayers()
            self.apply(rect: self.readRect(call))
            call.resolve()
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.ensureLayers()
            self.apply(rect: self.readRect(call))
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.container?.removeFromSuperview()
            self.container = nil
            self.glass = nil
            self.highlight = nil
            call.resolve()
        }
    }

    // MARK: - Internals

    private struct GlassRect {
        var x: CGFloat
        var y: CGFloat
        var width: CGFloat
        var height: CGFloat
        var cornerRadius: CGFloat
    }

    private func readRect(_ call: CAPPluginCall) -> GlassRect {
        let x = CGFloat(call.getDouble("x") ?? 0)
        let y = CGFloat(call.getDouble("y") ?? 0)
        let w = CGFloat(call.getDouble("width") ?? 0)
        let h = CGFloat(call.getDouble("height") ?? 0)
        let r = CGFloat(call.getDouble("cornerRadius") ?? (h / 2))
        return GlassRect(x: x, y: y, width: w, height: h, cornerRadius: r)
    }

    private func ensureLayers() {
        guard let webView = self.webView, let host = webView.superview else { return }
        if container == nil {
            let c = UIView()
            c.isUserInteractionEnabled = false
            c.backgroundColor = .clear
            c.layer.masksToBounds = true
            host.addSubview(c)
            container = c
        }
        if glass == nil, let c = container {
            // Try the iOS 26 Liquid Glass effect via reflection; fall back to
            // systemUltraThinMaterial on older OS versions. This keeps the
            // file compiling against any current Xcode SDK.
            let effect: UIVisualEffect = {
                if #available(iOS 26.0, *) {
                    if let cls = NSClassFromString("UIGlassEffect") as? UIVisualEffect.Type {
                        return cls.init()
                    }
                }
                return UIBlurEffect(style: .systemUltraThinMaterial)
            }()
            let v = UIVisualEffectView(effect: effect)
            v.isUserInteractionEnabled = false
            v.frame = c.bounds
            v.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            c.addSubview(v)
            glass = v

            // Subtle inner highlight band — adds the specular "lensing" feel
            // on iOS versions without the real Liquid Glass effect.
            let g = CAGradientLayer()
            g.colors = [
                UIColor.white.withAlphaComponent(0.18).cgColor,
                UIColor.white.withAlphaComponent(0.04).cgColor,
                UIColor.clear.cgColor,
            ]
            g.locations = [0.0, 0.35, 1.0]
            g.startPoint = CGPoint(x: 0.5, y: 0.0)
            g.endPoint   = CGPoint(x: 0.5, y: 1.0)
            v.contentView.layer.addSublayer(g)
            highlight = g

            // Hairline edge stroke.
            v.layer.borderWidth = 1.0 / UIScreen.main.scale
            v.layer.borderColor = UIColor.white.withAlphaComponent(0.16).cgColor
        }
    }

    private func apply(rect: GlassRect) {
        guard let c = container else { return }
        let frame = CGRect(x: rect.x, y: rect.y, width: rect.width, height: rect.height)
        // Avoid implicit animations on every JS-driven update.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        c.frame = frame
        c.layer.cornerRadius = rect.cornerRadius
        c.layer.cornerCurve = .continuous
        glass?.layer.cornerRadius = rect.cornerRadius
        glass?.layer.cornerCurve = .continuous
        glass?.layer.masksToBounds = true
        highlight?.frame = c.bounds
        CATransaction.commit()
    }
}
