const CIDADES: { nome: string; zona: string }[] = [
  { nome: "Maputo", zona: "Capital · Sul" },
  { nome: "Matola", zona: "Província de Maputo" },
  { nome: "Beira", zona: "Sofala · Centro" },
  { nome: "Nampula", zona: "Norte" },
  { nome: "Chimoio", zona: "Manica · Centro" },
  { nome: "Nacala", zona: "Costa Norte" },
  { nome: "Quelimane", zona: "Zambézia" },
  { nome: "Tete", zona: "Vale do Zambeze" },
  { nome: "Pemba", zona: "Cabo Delgado" },
  { nome: "Inhambane", zona: "Costa Sul" },
  { nome: "Xai-Xai", zona: "Gaza · Sul" },
  { nome: "Lichinga", zona: "Niassa · Norte" },
];

export function CidadesSection() {
  return (
    <section id="cidades" className="hl-section">
      <div className="hl-container">
        <div className="hl-section-head reveal">
          <span className="hl-eyebrow">Cidades</span>
          <h2 className="hl-h2">
            Encontros em Moçambique,
            <br />
            <span className="hl-italic">da Ponta do Ouro a Palma.</span>
          </h2>
          <p className="hl-section-sub">
            Comunidade ativa em todas as principais cidades — e a crescer todos os dias.
          </p>
        </div>

        <div className="hl-cidades-grid">
          {CIDADES.map((c) => (
            <div key={c.nome} className="hl-cidade-card glass-ghost reveal">
              <h3>Namoro em {c.nome}</h3>
              <p>{c.zona}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
