import Foundation
import Capacitor
import UIKit

/// NativeTabsPlugin
///
/// Cria uma UITabBar nativa por cima da WKWebView. Em iOS 26 o sistema
/// aplica automaticamente o material Liquid Glass real (refração + specular)
/// — não há nenhum CSS ou overlay a simular. Em iOS 15–25 é o material
/// padrão da UITabBar (blur do sistema), também nativo.
///
/// JS API:
///   NativeTabs.show({ items: [{ title, symbol, badge?, selected? }] })
///   NativeTabs.hide()
///   NativeTabs.setSelected({ index })
///   NativeTabs.setBadge({ index, value })
///
/// Events:
///   "tabSelected"  -> { index }
///   "heightChanged" -> { height }
@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSelected", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBadge",    returnType: CAPPluginReturnPromise)
    ]

    private var tabBar: UITabBar?
    private var tabBarDelegateProxy: TabBarDelegateProxy?

    // MARK: - Public methods

    @objc func show(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        DispatchQueue.main.async {
            self.installTabBar(items: items)
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.tabBar?.removeFromSuperview()
            self.tabBar = nil
            call.resolve()
        }
    }

    @objc func setSelected(_ call: CAPPluginCall) {
        guard let index = call.getInt("index") else {
            call.reject("index required")
            return
        }
        DispatchQueue.main.async {
            guard let bar = self.tabBar, let items = bar.items,
                  index >= 0, index < items.count else {
                call.resolve()
                return
            }
            bar.selectedItem = items[index]
            call.resolve()
        }
    }

    @objc func setBadge(_ call: CAPPluginCall) {
        guard let index = call.getInt("index") else {
            call.reject("index required")
            return
        }
        let value = call.getString("value")
        DispatchQueue.main.async {
            guard let bar = self.tabBar, let items = bar.items,
                  index >= 0, index < items.count else {
                call.resolve()
                return
            }
            let trimmed = value?.trimmingCharacters(in: .whitespaces) ?? ""
            items[index].badgeValue = trimmed.isEmpty ? nil : trimmed
            call.resolve()
        }
    }

    // MARK: - Install

    private func installTabBar(items: [JSObject]) {
        guard let webView = self.bridge?.webView,
              let parent = webView.superview else { return }

        // Remove a barra anterior, se existir.
        tabBar?.removeFromSuperview()

        // ── Transparência da WKWebView ──────────────────────────────────────
        // Para o UITabBar (iOS 26 Liquid Glass) refractar o conteúdo da página
        // por baixo, a WKWebView e o seu scrollView NÃO podem ser opacos.
        // O fundo visível passa a ser o do parent / window — pintamos a cor
        // escura da app aí para manter o look quando a página tem áreas
        // transparentes.
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        parent.backgroundColor = UIColor(red: 0x07/255.0, green: 0x06/255.0, blue: 0x0a/255.0, alpha: 1.0)
        if let window = parent.window {
            window.backgroundColor = parent.backgroundColor
        }



        let bar = UITabBar()
        bar.translatesAutoresizingMaskIntoConstraints = false

        // iOS 26+: UITabBar aplica Liquid Glass automaticamente quando a
        // appearance NÃO é customizada. Se chamarmos configureWithDefaultBackground()
        // ou configureWithOpaqueBackground(), o sistema desliga o Liquid Glass.
        // Em iOS < 26 mantemos o material translúcido padrão (também nativo).
        if #available(iOS 26.0, *) {
            // Não tocar em appearance — deixa o sistema aplicar UIGlassEffect.
        } else if #available(iOS 15.0, *) {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()
            bar.standardAppearance = appearance
            bar.scrollEdgeAppearance = appearance
        }

        // Para o Liquid Glass refractar conteúdo, a WebView e o body precisam
        // de ter algo visível por trás da barra. Tornamos o fundo da janela
        // visível por baixo da tab bar (a WebView já é transparente).
        bar.isTranslucent = true

        // Constrói os itens.
        var tabItems: [UITabBarItem] = []
        var selectedIndex: Int = 0
        for (idx, raw) in items.enumerated() {
            let title  = raw["title"]  as? String
            let symbol = (raw["symbol"] as? String) ?? "circle"
            let badge  = raw["badge"]  as? String
            let selected = (raw["selected"] as? Bool) ?? false

            let image = UIImage(systemName: symbol)
            let tabItem = UITabBarItem(title: title, image: image, tag: idx)
            if let badge = badge, !badge.isEmpty {
                tabItem.badgeValue = badge
            }
            tabItems.append(tabItem)
            if selected { selectedIndex = idx }
        }
        bar.items = tabItems
        if !tabItems.isEmpty {
            bar.selectedItem = tabItems[min(selectedIndex, tabItems.count - 1)]
        }

        // Delegate proxy emite eventos para o JS.
        let proxy = TabBarDelegateProxy { [weak self] index in
            self?.notifyListeners("tabSelected", data: ["index": index])
        }
        bar.delegate = proxy
        self.tabBarDelegateProxy = proxy

        parent.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.leadingAnchor.constraint(equalTo: parent.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: parent.trailingAnchor),
            bar.bottomAnchor.constraint(equalTo: parent.bottomAnchor)
        ])

        self.tabBar = bar

        // Reporta a altura (inclui safe area) ao JS para reservar espaço.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            let h = bar.frame.height
            self.notifyListeners("heightChanged", data: ["height": h])
        }
    }
}

// MARK: - Delegate proxy

private final class TabBarDelegateProxy: NSObject, UITabBarDelegate {
    private let onSelect: (Int) -> Void
    init(onSelect: @escaping (Int) -> Void) {
        self.onSelect = onSelect
    }
    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        onSelect(item.tag)
    }
}
