# LiquidGlass — Capacitor plugin (iOS only)

Native Apple Liquid Glass for the Hunie bottom nav.

- **iOS 26+**: usa `UIGlassEffect` (Liquid Glass verdadeiro, com refração e specular dinâmico).
- **iOS 17–25**: fallback automático para `UIVisualEffectView` com `.systemUltraThinMaterial`.
- **Web / Android**: stub no-op — o CSS atual continua a desenhar o vidro.

## Instalação automática (recomendado)

O plugin está registado como dependência local no `package.json` raiz:

```json
"liquid-glass": "file:./ios-native/liquid-glass"
```

1. Instala dependências (se ainda não fizeste):
   ```bash
   bun install
   ```

2. Gera/actualiza o projeto iOS:
   ```bash
   npx cap add ios        # só se ainda não tens a pasta ios/
   npx cap sync ios
   ```

3. O Capacitor adiciona o target `LiquidGlassPlugin` ao Podfile automaticamente. Abre o Xcode:
   ```bash
   npx cap open ios
   ```

4. No Xcode confirma:
   - O target **App** depende do pod `LiquidGlassPlugin` (ver `Pods` → `LiquidGlassPlugin`).
   - **iOS Deployment Target** do target App ≥ **14.0** (recomendado 17.0+).
   - Build & Run.

> Não é preciso arrastar ficheiros manualmente — `cap sync ios` coloca o plugin no target certo.

## Verificação rápida no Xcode

Depois de `cap sync ios`, confirma que existem no projeto:

- `ios/App/Pods/LiquidGlassPlugin/ios/Plugin/LiquidGlassPlugin.swift`
- `ios/App/Pods/LiquidGlassPlugin/ios/Plugin/LiquidGlassPlugin.m`

E que o ficheiro `LiquidGlassPlugin.m` aparece na lista **Compile Sources** do target **LiquidGlassPlugin** (Build Phases → Compile Sources).

## API JS

```ts
import { LiquidGlass } from '@/lib/native/liquidGlass'

await LiquidGlass.show({ x, y, width, height, cornerRadius })
await LiquidGlass.update({ x, y, width, height, cornerRadius })
await LiquidGlass.hide()
```

Todas as coordenadas são **CSS pixels** (o plugin converte para points nativos).

## Build sem warnings

Para um build limpo:

- Mantém o **Deployment Target** consistente entre o target App e o pod `LiquidGlassPlugin` (mínimo 14.0).
- Não uses `UIGlassEffect` em dispositivos/simuladores iOS < 26 — o `#available(iOS 26.0, *)` bloqueia o caminho seguro.
- A propriedade `cornerCurve = .continuous` requer iOS 13+ (já coberto pelo deployment target 14.0).
