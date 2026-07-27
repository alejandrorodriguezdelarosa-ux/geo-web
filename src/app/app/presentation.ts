import type { GeoAudit } from "./GeoReport"

// Escapa caracteres especiales en HTML
function esc(s: string | null | undefined): string {
  if (!s) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildPresentationHtml(data: GeoAudit): string {
  // Determina el color del score para la portada
  const scoreColor = data.geo_score >= 70 ? "#16a34a" : data.geo_score >= 40 ? "#d97706" : "#dc2626"

  // Mapeo de labels para subscores
  const SUB_LABEL: Record<string, string> = {
    citability: "Citabilidad",
    structure: "Estructura",
    technical: "Tecnica",
    authority: "Autoridad",
    multimodal: "Multimedia",
    visibility: "Visibilidad de marca",
    commercial_signals: "Senales comerciales",
  }

  // Mapeo de impactos a clases
  const impactClass = (impact: string): string => {
    const lower = impact?.toLowerCase() || "bajo"
    if (lower.includes("alto")) return "alto"
    if (lower.includes("medio")) return "medio"
    return "bajo"
  }

  // Construye la lista de slides
  let slides = ""

  // Slide 1: Portada
  slides += `<section class="slide">
    <div class="section-tag">
      <div class="tag-bar"></div>
      <span>Informe GEO</span>
    </div>
    <h1>${esc(data.brand || "Informe GEO")}</h1>
    <div class="desc">
      ${data.page_type ? `${esc(data.page_type)}${data.product_category ? ` • ${esc(data.product_category)}` : ""}` : ""}
    </div>
    <div style="margin-top: 30px; display: flex; align-items: center; gap: 40px;">
      <div class="score-circle" style="border-color: ${scoreColor}; color: ${scoreColor};">
        ${data.geo_score}
      </div>
      <div>
        ${data.summary ? `<div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">${esc(data.summary.verdict_label)}</div>
        <div class="desc">${esc(data.summary.verdict_sentence)}</div>` : ""}
        <div class="desc" style="margin-top: 12px; color: var(--text-muted);">Nicho: ${esc(data.detected_niche)}</div>
      </div>
    </div>
  </section>`

  // Slide 2: Resumen (solo si existe summary)
  if (data.summary) {
    slides += `<section class="slide">
      <h2>Resumen</h2>
      <p class="desc" style="font-size: 16px; line-height: 1.6; color: var(--text-secondary); margin: 0;">${esc(data.summary.executive_text)}</p>
      <div class="desc" style="margin-top: 20px; color: var(--text-muted);">${esc(data.summary.score_context)}</div>
    </section>`
  }

  // Slide 3: Puntuaciones
  if (data.dimensions_explained && data.dimensions_explained.length > 0) {
    slides += `<section class="slide">
      <h2>Puntuaciones</h2>
      <div class="kpis">`
    for (const d of data.dimensions_explained) {
      slides += `<div class="card">
        <div class="kpi-label">${esc(d.label)}</div>
        <div class="kpi-val">${d.value != null ? d.value : "N/A"}</div>
        <div class="muted">${esc(d.interpretation)}</div>
      </div>`
    }
    slides += `</div>
    </section>`
  }

  // Slide 4: Plan de accion (solo si existe action_plan)
  if (data.action_plan && data.action_plan.length > 0) {
    slides += `<section class="slide">
      <h2>Plan de accion priorizado</h2>
      <ul>`
    for (let i = 0; i < data.action_plan.length; i++) {
      const a = data.action_plan[i]
      const impactClass_ = impactClass(a.impact)
      const effortClass = a.effort?.toLowerCase() || "bajo"
      slides += `<li class="item">
        <div class="t">${i + 1}. ${esc(a.title)}</div>
        <div style="margin: 6px 0; display: flex; gap: 8px;">
          <span class="badge ${impactClass_}">${esc(a.impact)}</span>
          <span class="pill">${esc(a.effort)}</span>
        </div>
        <div class="muted"><strong>Por que:</strong> ${esc(a.why)}</div>
        <div class="muted"><strong>Como:</strong> ${esc(a.how)}</div>
      </li>`
    }
    slides += `</ul>
    </section>`
  }

  // Slide 5: Plataformas de IA (solo si data.platforms existe)
  if (data.platforms && data.platforms.platforms.length > 0) {
    slides += `<section class="slide">
      <h2>Preparacion por plataforma de IA</h2>
      <div class="kpis">`
    for (const p of data.platforms.platforms) {
      slides += `<div class="card">
        <div class="kpi-label">${esc(p.label)}</div>
        <div class="kpi-val">${p.score != null ? p.score : "N/A"}</div>
        <div class="muted">${p.tips.map(t => esc(t)).join(" · ")}</div>
      </div>`
    }
    slides += `</div>
    </section>`
  }

  // Slide 6: Marca y Multimedia
  const hasBrandVisibility = data.visibility && Object.keys(data.visibility.presence).length > 0
  const hasMultimodal = data.multimodal && (data.multimodal.images.total > 0 || data.multimodal.video.present)
  if (hasBrandVisibility || hasMultimodal) {
    slides += `<section class="slide">
      <h2>Marca y multimedia</h2>`

    if (hasBrandVisibility) {
      slides += `<div style="margin-bottom: 24px;">
        <div class="desc" style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Presencia de marca:</div>`
      for (const [name, ok] of Object.entries(data.visibility!.presence)) {
        slides += `<div class="desc">${ok ? "✓" : "✗"} ${esc(name)}</div>`
      }
      slides += `</div>`
    }

    if (hasMultimodal) {
      slides += `<div>
        <div class="desc" style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Multimedia:</div>
        <div class="desc">Imagenes: ${data.multimodal!.images.total} (${data.multimodal!.images.with_alt} con alt, ${data.multimodal!.images.without_alt} sin alt)</div>
        <div class="desc">Video: ${data.multimodal!.video.present ? "si" : "no"}</div>
      </div>`
    }

    slides += `</section>`
  }

  // Slide 7: Fortalezas (solo si existen)
  if (data.strengths && data.strengths.length > 0) {
    slides += `<section class="slide">
      <h2>Lo que ya haces bien</h2>
      <ul>`
    for (const s of data.strengths) {
      slides += `<li class="item">
        <div class="t">✓ ${esc(s)}</div>
      </li>`
    }
    slides += `</ul>
    </section>`
  }

  // Estilos CSS (variables de Pampling design system)
  const styles = `
    :root {
      --bg-base: #F5F0EB;
      --bg-card: rgba(255, 255, 255, 0.70);
      --bg-card-2: rgba(255, 255, 255, 0.90);
      --border: rgba(45, 42, 38, 0.08);
      --text-primary: #2D2A26;
      --text-secondary: rgba(45, 42, 38, 0.60);
      --text-muted: rgba(45, 42, 38, 0.35);
      --accent-a: #7947F8;
      --accent-a-end: #A855F7;
      --accent-a-grad: linear-gradient(135deg, #7947F8, #A855F7);
      --accent-a-soft: rgba(121, 71, 248, 0.10);
      --green: #5C8A6C;
      --green-soft: rgba(92, 138, 108, 0.12);
      --amber: #C99555;
      --amber-soft: rgba(201, 149, 85, 0.12);
      --red: #E05252;
      --red-soft: rgba(224, 82, 82, 0.12);
      --radius: 16px;
      --radius-sm: 8px;
      --shadow: 0 1px 4px rgba(45, 42, 38, 0.06);
      --shadow-md: 0 4px 16px rgba(45, 42, 38, 0.08);
      --font: 'Poppins', system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      background: var(--bg-base);
      color: var(--text-primary);
    }
    .slide {
      min-height: 100vh;
      box-sizing: border-box;
      padding: 56px 64px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      border-bottom: 1px solid var(--border);
    }
    .section-tag {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-a);
      margin-bottom: 2px;
    }
    .tag-bar {
      width: 24px;
      height: 3px;
      background: var(--accent-a);
      border-radius: 2px;
    }
    h1 {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -1px;
      margin: 0;
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }
    .desc {
      font-size: 14px;
      color: var(--text-secondary);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      box-shadow: var(--shadow);
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .kpi-val {
      font-size: 28px;
      font-weight: 800;
      color: var(--accent-a);
      letter-spacing: -1px;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 6px solid var(--accent-a);
      font-size: 44px;
      font-weight: 800;
      color: var(--accent-a);
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
    }
    .badge.alto {
      color: var(--red);
      background: var(--red-soft);
    }
    .badge.medio {
      color: var(--amber);
      background: var(--amber-soft);
    }
    .badge.bajo {
      color: var(--green);
      background: var(--green-soft);
    }
    .pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      background: var(--accent-a-soft);
      color: var(--accent-a);
    }
    ul {
      margin: 0;
      padding-left: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .item {
      border-left: 3px solid var(--accent-a);
      padding-left: 12px;
    }
    .item .t {
      font-weight: 700;
      font-size: 15px;
    }
    .muted {
      color: var(--text-secondary);
      font-size: 13px;
    }
    @media print {
      .slide {
        min-height: auto;
        page-break-after: always;
        border-bottom: none;
      }
      @page {
        size: A4 landscape;
        margin: 0;
      }
    }
  `

  // Construye el documento HTML completo
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe GEO</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${styles}
  </style>
</head>
<body>
  ${slides}
</body>
</html>`

  return html
}
