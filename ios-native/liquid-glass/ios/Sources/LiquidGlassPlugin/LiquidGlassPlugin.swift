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

    private var glassViews: [String: GlassSurfaceView] = [:]
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

            NSLog("[LiquidGlass] show id=\(id) frame=\(frame) radius=\(radius) placement=\(placement) hasWebView=\(self.bridge?.webView != nil)")

            if let existing = self.glassViews[id] {
                NSLog("[LiquidGlass] reusing existing surface for \(id)")
                existing.configure(frame: frame, cornerRadius: radius, alpha: max(0, min(1, intensity)))
                self.applyMask(to: existing, frame: frame, cornerRadius: radius, exclusionFrames: exclusions)
            } else {
                let view = self.makeGlassView(frame: frame, cornerRadius: radius)
                view.configure(frame: frame, cornerRadius: radius, alpha: max(0, min(1, intensity)))
                view.isUserInteractionEnabled = false
                self.applyMask(to: view, frame: frame, cornerRadius: radius, exclusionFrames: exclusions)
                self.glassViews[id] = view
                if let webView = self.bridge?.webView, let parent = webView.superview {
                    if placement == "above" {
                        parent.insertSubview(view, aboveSubview: webView)
                        NSLog("[LiquidGlass] inserted ABOVE webView, parent=\(type(of: parent)) parentBounds=\(parent.bounds)")
                    } else {
                        self.ensureWebViewTransparent()
                        parent.insertSubview(view, belowSubview: webView)
                        NSLog("[LiquidGlass] inserted BEHIND webView (transparent), parent=\(type(of: parent)) parentBounds=\(parent.bounds)")
                    }
                } else {
                    NSLog("[LiquidGlass] ERROR — no webView/parent available")
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
            gv.configure(frame: frame, cornerRadius: radius, alpha: intensity.map { max(0, min(1, $0)) })
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

    private func makeGlassView(frame: CGRect, cornerRadius: CGFloat) -> GlassSurfaceView {
        let view = GlassSurfaceView(frame: frame)
        #if compiler(>=6.0)
        if #available(iOS 26.0, *) {
            // Real Apple Liquid Glass — uses UIGlassEffect from the iOS 26 SDK.
            // The effect already renders refraction + specular highlights, so
            // we strip the fallback tint / gradient / stroke overlays that
            // would otherwise sit on top and flatten it back into a blur.
            let effect = UIGlassEffect()
            effect.isInteractive = true
            view.effectView.effect = effect
            view.stripFallbackOverlays()
            view.configure(frame: frame, cornerRadius: cornerRadius, alpha: nil)
            NSLog("[LiquidGlass] using native UIGlassEffect (iOS 26) — overlays stripped")
            return view
        }
        #endif
        let blur = UIBlurEffect(style: .systemUltraThinMaterial)
        view.effectView.effect = blur
        view.configure(frame: frame, cornerRadius: cornerRadius, alpha: nil)
        NSLog("[LiquidGlass] fallback UIBlurEffect .systemUltraThinMaterial")
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

private final class GlassSurfaceView: UIView {
    let effectView = UIVisualEffectView(effect: nil)
    private let tintView = UIView()
    private let strokeLayer = CAShapeLayer()
    private let topHighlightLayer = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        clipsToBounds = true

        effectView.frame = bounds
        effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(effectView)

        tintView.frame = bounds
        tintView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        tintView.backgroundColor = UIColor(white: 1.0, alpha: 0.10)
        tintView.isUserInteractionEnabled = false
        addSubview(tintView)

        topHighlightLayer.colors = [
            UIColor(white: 1.0, alpha: 0.30).cgColor,
            UIColor(white: 1.0, alpha: 0.06).cgColor,
            UIColor(white: 1.0, alpha: 0.00).cgColor,
        ]
        topHighlightLayer.locations = [0.0, 0.34, 1.0]
        layer.addSublayer(topHighlightLayer)

        strokeLayer.fillColor = UIColor.clear.cgColor
        strokeLayer.strokeColor = UIColor(white: 1.0, alpha: 0.24).cgColor
        strokeLayer.lineWidth = 1.0 / UIScreen.main.scale
        layer.addSublayer(strokeLayer)
    }

    /// Remove tint / top highlight / stroke when the real UIGlassEffect is
    /// active — the effect renders its own specular + edge and any overlay
    /// flattens it back into a plain blur.
    func stripFallbackOverlays() {
        tintView.removeFromSuperview()
        topHighlightLayer.removeFromSuperlayer()
        strokeLayer.removeFromSuperlayer()
    }


    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(frame: CGRect, cornerRadius: CGFloat, alpha: CGFloat?) {
        self.frame = frame
        if let alpha { self.alpha = alpha }
        layer.cornerRadius = cornerRadius
        layer.cornerCurve = .continuous
        effectView.layer.cornerRadius = cornerRadius
        effectView.layer.cornerCurve = .continuous
        effectView.clipsToBounds = true
        tintView.layer.cornerRadius = cornerRadius
        tintView.layer.cornerCurve = .continuous
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        effectView.frame = bounds
        tintView.frame = bounds
        topHighlightLayer.frame = CGRect(x: 0, y: 0, width: bounds.width, height: bounds.height * 0.58)
        let strokeRect = bounds.insetBy(dx: strokeLayer.lineWidth / 2, dy: strokeLayer.lineWidth / 2)
        strokeLayer.path = UIBezierPath(roundedRect: strokeRect, cornerRadius: max(0, layer.cornerRadius - strokeLayer.lineWidth / 2)).cgPath
    }
}
