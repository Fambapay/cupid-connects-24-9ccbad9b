import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/termos")({
  head: () => ({
    meta: [
      { title: "Termos e Condições — Hunie" },
      {
        name: "description",
        content:
          "Termos de utilização da Hunie, a comunidade de encontros feita em Moçambique. Direitos, deveres, pagamentos e regras de conduta.",
      },
      { property: "og:title", content: "Termos e Condições — Hunie" },
      {
        property: "og:description",
        content: "As regras que governam a utilização da Hunie.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app/legal/termos" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={"/icon-192.png"} alt="Hunie" className="h-8 w-8" />
            <span className="font-serif text-lg">Hunie</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-4xl md:text-5xl">Termos e Condições</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 3 de Junho de 2026 · Versão 1.0
        </p>

        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-serif text-2xl text-foreground">1. Aceitação dos termos</h2>
            <p>
              Ao criares conta, acederes ou utilizares a <strong>Hunie</strong>{" "}
              (acessível em <a href="https://hunie.app" className="underline">hunie.app</a>),
              aceitas integralmente estes Termos e Condições, bem como a nossa{" "}
              <Link to="/legal/privacidade" className="underline">
                Política de Privacidade
              </Link>
              . Se não concordares, não deves utilizar o serviço.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">2. Quem pode usar</h2>
            <ul className="ml-6 list-disc space-y-1">
              <li>Maiores de <strong>18 anos</strong>;</li>
              <li>Pessoas com capacidade legal para celebrar contratos;</li>
              <li>Que não tenham conta previamente suspensa ou eliminada por violação destes Termos;</li>
              <li>Que se comprometem a fornecer informação verdadeira no perfil.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">3. Natureza do serviço</h2>
            <p>
              A Hunie é uma plataforma de encontros que permite criar um perfil,
              descobrir outros utilizadores, dar match e trocar mensagens. A Hunie{" "}
              <strong>não garante</strong> que encontrarás um par, nem se responsabiliza
              pelas interações off-line entre utilizadores. Cada utilizador é
              responsável pelas suas decisões e pela sua segurança pessoal.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">4. Conta e verificação</h2>
            <p>
              Cada pessoa pode ter apenas uma conta. Podemos exigir verificação por
              SMS e/ou selfie para confirmar a identidade. O utilizador é responsável
              por manter a confidencialidade da sua palavra-passe e por toda a
              atividade na sua conta.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">5. Conduta e conteúdo proibido</h2>
            <p>Não é permitido:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Conteúdo sexual explícito, nudez ou pornografia;</li>
              <li>Fotografias de menores;</li>
              <li>Discurso de ódio, ameaças, assédio, bullying ou discriminação;</li>
              <li>Fraudes, esquemas piramidais, pedidos de dinheiro a outros utilizadores;</li>
              <li>Promoção de serviços de acompanhantes ou prostituição;</li>
              <li>Fingir ser outra pessoa (catfishing) ou usar fotos de terceiros;</li>
              <li>Publicação de dados pessoais de terceiros sem consentimento;</li>
              <li>Utilização de bots, scrapers ou ferramentas automatizadas;</li>
              <li>Qualquer conduta proibida pela legislação moçambicana.</li>
            </ul>
            <p>
              A violação destas regras pode levar à suspensão imediata sem direito a
              reembolso. Denúncias podem ser feitas dentro da app ou por email para{" "}
              <a href="mailto:abuso@hunie.app" className="underline">abuso@hunie.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">6. Subscrições e créditos</h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Membership Plus e Select</strong> são vendidos em períodos
                pré-pagos (semanal, mensal, trimestral) em meticais (MZN).
              </li>
              <li>
                <strong>Pacotes de créditos</strong> (Boost, Super Like) são
                consumíveis e não expiram.
              </li>
              <li>
                Pagamentos são processados via <strong>M-Pesa</strong>, <strong>e-Mola</strong>{" "}
                ou cartão, através do nosso parceiro Débito.
              </li>
              <li>
                Os preços incluem todos os impostos aplicáveis em Moçambique.
              </li>
              <li>
                As subscrições <strong>não se renovam automaticamente</strong>, salvo
                indicação expressa contrária no momento da compra.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">7. Política de reembolsos</h2>
            <p>
              Nos termos da <strong>Lei n.º 34/2014</strong> (Defesa do Consumidor),
              tens direito a:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>
                <strong>Reembolso integral</strong> em caso de erro técnico que tenha
                impedido o uso do serviço pago;
              </li>
              <li>
                <strong>Reembolso proporcional</strong> em caso de suspensão indevida
                da conta;
              </li>
              <li>
                Os créditos consumíveis (Boost, Super Like) <strong>não são
                reembolsáveis</strong> após utilização.
              </li>
            </ul>
            <p>
              Pedidos devem ser enviados em até 14 dias para{" "}
              <a href="mailto:suporte@hunie.app" className="underline">
                suporte@hunie.app
              </a>{" "}
              com o comprovativo de pagamento.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">8. Propriedade intelectual</h2>
            <p>
              A marca <strong>Hunie</strong>, o logotipo, o design e o código são
              propriedade da Hunie. O conteúdo que publicas (fotos, biografia, prompts,
              mensagens) continua a ser teu, mas concedes à Hunie uma licença não
              exclusiva, mundial e gratuita para o utilizar, armazenar e exibir
              estritamente para prestação do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">9. Suspensão e eliminação de conta</h2>
            <p>
              Podemos suspender ou eliminar contas que violem estes Termos, sem aviso
              prévio em casos graves (fraude, conteúdo ilegal, ameaças). Podes
              eliminar a tua conta a qualquer momento nas Definições da aplicação.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">10. Limitação de responsabilidade</h2>
            <p>
              A Hunie é fornecida "tal como está". Na máxima extensão permitida pela
              lei moçambicana, a Hunie não se responsabiliza por:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Comportamento de outros utilizadores, dentro ou fora da plataforma;</li>
              <li>Danos indiretos, incluindo perda de oportunidade ou dano moral decorrente de interações entre utilizadores;</li>
              <li>Interrupções temporárias do serviço por manutenção ou falhas de infraestrutura;</li>
              <li>Conteúdo publicado por utilizadores.</li>
            </ul>
            <p>
              Nada nestes Termos exclui responsabilidades que, nos termos da lei,
              sejam inderrogáveis.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">11. Segurança nos encontros</h2>
            <p>
              Recomendamos vivamente:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Marcar primeiros encontros em locais públicos;</li>
              <li>Avisar uma pessoa de confiança;</li>
              <li>Nunca enviar dinheiro a alguém que conheceste online;</li>
              <li>Denunciar imediatamente comportamentos suspeitos;</li>
              <li>Em caso de crime, contactar a Polícia da República de Moçambique (PRM).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">12. Alterações</h2>
            <p>
              Podemos alterar estes Termos. Alterações materiais serão comunicadas
              dentro da aplicação ou por email com pelo menos 15 dias de antecedência.
              Continuar a usar a Hunie após a entrada em vigor implica aceitação das
              alterações.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">13. Lei aplicável e foro</h2>
            <p>
              Estes Termos regem-se pela lei da{" "}
              <strong>República de Moçambique</strong>. Para resolver qualquer litígio
              decorrente da utilização da Hunie, é competente o foro da Cidade de
              Maputo, com renúncia expressa a qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">14. Contacto</h2>
            <p>
              Suporte geral:{" "}
              <a href="mailto:suporte@hunie.app" className="underline">
                suporte@hunie.app
              </a>
              <br />
              Denúncias:{" "}
              <a href="mailto:abuso@hunie.app" className="underline">
                abuso@hunie.app
              </a>
              <br />
              Privacidade:{" "}
              <a href="mailto:privacidade@hunie.app" className="underline">
                privacidade@hunie.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 flex flex-wrap gap-4 border-t border-border/40 pt-8 text-sm">
          <Link to="/legal/privacidade" className="text-muted-foreground hover:text-foreground">
            Política de Privacidade →
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
