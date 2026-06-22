# LiquidGlass — Capacitor plugin (iOS only)

Native Apple Liquid Glass for the Hunie bottom nav.

- **iOS 26+**: usa `UIGlassEffect` (Liquid Glass verdadeiro, com refração e specular dinâmico).
- **iOS 17–25**: fallback automático para `UIVisualEffectView` com `.systemUltraThinMaterial`.
- **Web / Android**: stub no-op — o CSS atual continua a desenhar o vidro.

## Como instalar no Xcode (uma vez)

Depois de correres `npx cap add ios` (se ainda não tens a pasta `ios/`):

1. Abre `ios/App/App.xcworkspace`.
2. No navegador do projeto, **arrasta** os ficheiros desta pasta (`LiquidGlassPlugin.swift` e `LiquidGlassPlugin.m`) para dentro do target **App**. Quando perguntar, marca **Copy items if needed** e adiciona ao target App.
3. Garante que o **iOS Deployment Target** do target App é **17.0 ou superior** (Liquid Glass real só ativa em 26+; abaixo disso usa o blur clássico).
4. Build e run. O JS regista o plugin automaticamente via `registerPlugin('LiquidGlass', ...)`.

> Não é preciso editar `Podfile` — é um plugin local, compila com o app.

## API JS

```ts
import { LiquidGlass } from '@/lib/native/liquidGlass'

await LiquidGlass.show({ x, y, width, height, cornerRadius })
await LiquidGlass.update({ x, y, width, height, cornerRadius })
await LiquidGlass.hide()
```

Todas as coordenadas são **CSS pixels** (o plugin converte para points nativos).
