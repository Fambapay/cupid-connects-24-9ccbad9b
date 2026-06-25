---
name: Liquid Glass Rule
description: Liquid glass effect can affect anything except text inside pills (labels and icons must stay crisp)
type: design
---

**Regra absoluta do Liquid Glass:**

Tudo pode ser afetado pelo efeito liquid glass (refração, blur, distorção) — fundos, pills, superfícies — EXCETO o **texto e ícones dentro de qualquer pill**.

- Texto/ícones dentro de pills (bottom nav, action pills, etc.) devem permanecer **sempre nítidos e legíveis**, nunca desfocados nem distorcidos pelo glass.
- Implementação: renderizar texto/ícones por cima da camada de glass (z-index acima) OU usar máscara/área protegida no plugin nativo para que o efeito não toque essas regiões.
- Nunca baixar a intensidade do liquid glass para "proteger" o texto — em vez disso, isolar o texto da camada afetada.
