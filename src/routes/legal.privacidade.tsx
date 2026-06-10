import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Hunie" },
      {
        name: "description",
        content:
          "Como a Hunie recolhe, usa e protege os teus dados pessoais. Política de privacidade adaptada à legislação moçambicana.",
      },
      { property: "og:title", content: "Política de Privacidade — Hunie" },
      {
        property: "og:description",
        content: "Transparência total sobre dados pessoais na Hunie.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app/legal/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={"/icon-192.png"} alt="Logótipo Hunie" className="h-8 w-8" />
            <span className="font-serif text-lg">Hunie</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-4xl md:text-5xl">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 3 de Junho de 2026 · Versão 1.0
        </p>

        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-serif text-2xl text-foreground">1. Quem somos</h2>
            <p>
              A <strong>Hunie</strong> é uma plataforma digital de encontros operada em
              Moçambique, acessível em <a href="https://hunie.app" className="underline">hunie.app</a>.
              Para efeitos desta política, a entidade responsável pelo tratamento dos
              teus dados pessoais (o <em>Responsável pelo Tratamento</em>) é a equipa
              Hunie, contactável em{" "}
              <a href="mailto:privacidade@hunie.app" className="underline">
                privacidade@hunie.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">2. Enquadramento legal</h2>
            <p>
              Esta política respeita a legislação moçambicana aplicável, nomeadamente:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>
                <strong>Lei n.º 3/2017</strong>, de 9 de Janeiro, que estabelece o regime
                jurídico das transações eletrónicas em Moçambique;
              </li>
              <li>
                <strong>Lei n.º 34/2014</strong>, de 31 de Dezembro, sobre Defesa do
                Consumidor;
              </li>
              <li>
                <strong>Constituição da República de Moçambique</strong>, artigo 41.º
                (direito à reserva da intimidade da vida privada);
              </li>
              <li>
                Princípios de boas práticas internacionais de proteção de dados,
                incluindo as recomendações do INCM (Instituto Nacional das Comunicações
                de Moçambique).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">3. Que dados recolhemos</h2>
            <p>Tratamos as seguintes categorias de dados quando usas a Hunie:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Dados de conta:</strong> email, número de telemóvel (para
                verificação por SMS), palavra-passe encriptada, data de criação.
              </li>
              <li>
                <strong>Dados de perfil:</strong> nome próprio, data de nascimento,
                género, orientação, cidade, biografia, prompts, fotografias e
                preferências de procura.
              </li>
              <li>
                <strong>Dados de verificação:</strong> selfie de verificação (apagada
                após validação manual e nunca partilhada com outros utilizadores) e
                estado de verificação.
              </li>
              <li>
                <strong>Dados de utilização:</strong> swipes, likes, matches, mensagens
                trocadas, conversas iniciadas, sessões e horário de última atividade.
              </li>
              <li>
                <strong>Dados de pagamento:</strong> histórico de subscrições e compras
                de créditos. O processamento de M-Pesa, e-Mola e cartão é feito pelo
                nosso parceiro de pagamentos (Débito); a Hunie <strong>não armazena</strong>{" "}
                números de cartão nem credenciais de carteira móvel.
              </li>
              <li>
                <strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo,
                sistema operativo, identificador de sessão de browser e, se autorizado,
                localização aproximada para sugerir perfis próximos.
              </li>
              <li>
                <strong>Notificações:</strong> se aceitares, guardamos a subscrição
                push do teu dispositivo (endpoint + chaves criptográficas) para
                enviar notificações.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">4. Para que usamos os teus dados</h2>
            <ul className="ml-6 list-disc space-y-1">
              <li>Prestar o serviço de encontros e sugerir perfis compatíveis;</li>
              <li>Verificar a tua identidade e combater perfis falsos;</li>
              <li>Permitir conversas e comunicação entre utilizadores;</li>
              <li>Processar pagamentos e gerir a tua subscrição;</li>
              <li>Enviar notificações sobre matches, mensagens e atividade da conta;</li>
              <li>Garantir a segurança da plataforma e moderar conteúdo;</li>
              <li>Cumprir obrigações legais e responder a pedidos de autoridades.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">5. Base legal</h2>
            <p>
              Tratamos os teus dados com base no <strong>contrato de prestação de
              serviço</strong> que aceitaste ao criar conta, no <strong>teu
              consentimento</strong> (notificações push, partilha de localização,
              fotografias) e no nosso <strong>interesse legítimo</strong> em manter a
              plataforma segura e prevenir fraude.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">6. Partilha de dados</h2>
            <p>
              A Hunie <strong>não vende</strong> dados pessoais. Partilhamos apenas o
              estritamente necessário com:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>
                <strong>Outros utilizadores</strong> — o teu perfil público (nome,
                idade, cidade, fotografias, biografia) é visível para utilizadores
                elegíveis;
              </li>
              <li>
                <strong>Débito</strong> — processador de pagamentos para M-Pesa, e-Mola
                e cartão;
              </li>
              <li>
                <strong>Fornecedores de infraestrutura</strong> — alojamento na nuvem e
                envio de email/SMS;
              </li>
              <li>
                <strong>Autoridades competentes</strong> — quando legalmente exigido
                (ordem judicial, investigação criminal).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">7. Conservação dos dados</h2>
            <ul className="ml-6 list-disc space-y-1">
              <li>Conta ativa: enquanto mantiveres conta na Hunie;</li>
              <li>Após eliminação da conta: apagados em 30 dias, exceto dados de pagamento (retidos por 5 anos para cumprimento fiscal);</li>
              <li>Selfies de verificação: apagadas após validação;</li>
              <li>Mensagens reportadas: retidas até 90 dias para fins de moderação.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">8. Os teus direitos</h2>
            <p>Tens o direito de:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Aceder aos dados que temos sobre ti;</li>
              <li>Corrigir dados incorretos diretamente no teu perfil;</li>
              <li>Eliminar a tua conta em qualquer momento nas Definições;</li>
              <li>Retirar o consentimento a notificações ou geolocalização;</li>
              <li>Solicitar uma cópia dos teus dados em formato portável;</li>
              <li>Apresentar reclamação às autoridades competentes em Moçambique.</li>
            </ul>
            <p>
              Para exercer qualquer destes direitos, escreve-nos para{" "}
              <a href="mailto:privacidade@hunie.app" className="underline">
                privacidade@hunie.app
              </a>
              . Respondemos no prazo máximo de 30 dias.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">9. Segurança</h2>
            <p>
              Aplicamos medidas técnicas e organizativas adequadas: palavras-passe
              encriptadas, comunicação por HTTPS, políticas de acesso restritivas à
              base de dados (Row-Level Security), verificação por SMS e moderação
              ativa. Apesar destas medidas, nenhum sistema é 100% inviolável; em caso
              de violação de dados pessoais, notificaremos os utilizadores afetados.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">10. Menores</h2>
            <p>
              A Hunie é exclusiva para maiores de <strong>18 anos</strong>. Se
              detetarmos uma conta de menor, é imediatamente eliminada. Se souberes de
              uma conta nestas condições, denuncia em{" "}
              <a href="mailto:abuso@hunie.app" className="underline">abuso@hunie.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">11. Cookies e tecnologias semelhantes</h2>
            <p>
              Usamos armazenamento local do browser (localStorage) para manter a tua
              sessão iniciada. Não usamos cookies de rastreamento publicitário de
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">12. Alterações a esta política</h2>
            <p>
              Podemos atualizar esta política. Alterações materiais serão comunicadas
              por email ou por aviso dentro da aplicação com pelo menos 15 dias de
              antecedência.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">13. Contacto</h2>
            <p>
              Para qualquer dúvida sobre privacidade:{" "}
              <a href="mailto:privacidade@hunie.app" className="underline">
                privacidade@hunie.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 flex flex-wrap gap-4 border-t border-border/40 pt-8 text-sm">
          <Link to="/legal/termos" className="text-muted-foreground hover:text-foreground">
            Termos e Condições →
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
