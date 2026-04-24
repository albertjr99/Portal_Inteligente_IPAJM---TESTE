import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GerencialDashboard } from './timeManagementService';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type RGB = [number, number, number];

// â”€â”€â”€ Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  g900:  [0,  55, 15] as RGB,
  g800:  [0,  80, 20] as RGB,
  g700:  [0, 110, 30] as RGB,
  g600:  [0, 140, 45] as RGB,
  g100:  [220, 245, 225] as RGB,
  g50:   [242, 252, 244] as RGB,
  red:   [185, 28,  28] as RGB,
  r100:  [254, 226, 226] as RGB,
  amber: [161, 108,   0] as RGB,
  a100:  [255, 247, 220] as RGB,
  slate: [30,  41,  59] as RGB,
  s700:  [51,  65,  85] as RGB,
  s500:  [100, 116, 139] as RGB,
  s200:  [203, 213, 225] as RGB,
  s100:  [241, 245, 249] as RGB,
  white: [255, 255, 255] as RGB,
};

// â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatDateTime(): string {
  return new Date().toLocaleString('pt-BR');
}

function parseHhmm(v: string): number {
  if (!v || typeof v !== 'string') return 0;
  const trimmed = v.trim().replace('h', '');
  const neg = trimmed.startsWith('-');
  const parts = trimmed.replace('-', '').split(':').map(Number);
  if (isNaN(parts[0])) return 0;
  const mins = (parts[0] || 0) * 60 + (parts[1] || 0);
  return neg ? -mins : mins;
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function monthLabel(monthStr: string): string {
  const [yr, mo] = monthStr.split('-');
  return `${MONTHS_PT[parseInt(mo) - 1] ?? mo}/${yr.slice(2)}`;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// â”€â”€â”€ Auto-insights engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateInsights(d: GerencialDashboard) {
  const s = d.summary;
  const saldoMins    = parseHhmm(s.saldo_total_hhmm);
  const direitoMins  = parseHhmm(s.horas_direito_hhmm);
  const gozadasMins  = parseHhmm(s.horas_gozadas_hhmm);
  const pctGozado    = direitoMins > 0 ? Math.round((gozadasMins / direitoMins) * 100) : 0;

  const resumoGeral: string[] = [];
  resumoGeral.push(saldoMins >= 0
    ? `Saldo positivo de ${s.saldo_total_hhmm}h â€” banco de horas favorÃ¡vel no perÃ­odo analisado.`
    : `Saldo negativo de ${s.saldo_total_hhmm}h â€” compensaÃ§Ã£o de horas necessÃ¡ria pelos servidores.`);
  resumoGeral.push(`${pctGozado}% das horas de direito foram efetivamente gozadas (${s.horas_gozadas_hhmm}h de ${s.horas_direito_hhmm}h disponÃ­veis).`);
  resumoGeral.push(`AnÃ¡lise com base em ${s.registros_horas} lanÃ§amentos de ${s.total_servidores} servidores no perÃ­odo.`);

  const topServidores: string[] = [];
  const top = d.top_servidores;
  if (top.length > 0) {
    topServidores.push(`Maior saldo individual: ${toTitleCase(top[0].nome)} â€” ${top[0].saldo_hhmm}h (${top[0].setor}).`);
  }
  const negativosCount = top.filter(t => parseHhmm(t.saldo_hhmm) < 0).length;
  topServidores.push(negativosCount > 0
    ? `${negativosCount} servidor(es) no ranking com saldo negativo â€” requer acompanhamento prioritÃ¡rio.`
    : 'Todos os servidores listados apresentam saldo positivo â€” panorama favorÃ¡vel.');
  if (top.length >= 3) {
    const top3 = top.slice(0, 3).reduce((a, t) => a + Math.max(0, parseHhmm(t.saldo_hhmm)), 0);
    const total = top.reduce((a, t) => a + Math.max(0, parseHhmm(t.saldo_hhmm)), 0);
    const pct = total > 0 ? Math.round((top3 / total) * 100) : 0;
    if (pct > 0) topServidores.push(`Os 3 primeiros concentram ${pct}% do saldo positivo acumulado no ranking.`);
  }

  const saldoPorSetor: string[] = [];
  const setores = d.saldo_por_setor;
  if (setores.length > 0) {
    const sorted = [...setores].sort((a, b) => b.saldo - a.saldo);
    saldoPorSetor.push(`Melhor desempenho: ${sorted[0].setor} com saldo de ${sorted[0].saldo}h.`);
    const pior = sorted[sorted.length - 1];
    saldoPorSetor.push(pior.saldo < 0
      ? `Setor ${pior.setor} com saldo negativo de ${Math.abs(pior.saldo)}h â€” atenÃ§Ã£o imediata recomendada.`
      : `Menor saldo: ${pior.setor} (${pior.saldo}h) â€” ainda positivo.`);
    const neg = setores.filter(s => s.saldo < 0).length;
    saldoPorSetor.push(neg > 0
      ? `${neg} de ${setores.length} setores registram saldo negativo no perÃ­odo.`
      : `Todos os ${setores.length} setores apresentam saldo positivo.`);
  }

  const horasPorMes: string[] = [];
  const meses = d.horas_por_mes;
  if (meses.length > 0) {
    const pico = [...meses].sort((a, b) => b.liquidadas - a.liquidadas)[0];
    horasPorMes.push(`Pico de produtividade em ${monthLabel(pico.month)}: ${pico.liquidadas}h liquidadas.`);
    if (meses.length >= 6) {
      const last3 = meses.slice(-3).reduce((a, m) => a + m.liquidadas, 0) / 3;
      const prev3 = meses.slice(-6, -3).reduce((a, m) => a + m.liquidadas, 0) / 3;
      if (last3 > prev3 * 1.05)
        horasPorMes.push(`TendÃªncia de alta: Ãºltimos 3 meses (${Math.round(last3)}h/mÃªs) superam os 3 anteriores (${Math.round(prev3)}h/mÃªs).`);
      else if (last3 < prev3 * 0.95)
        horasPorMes.push(`TendÃªncia de queda: Ãºltimos 3 meses (${Math.round(last3)}h/mÃªs) abaixo dos 3 anteriores (${Math.round(prev3)}h/mÃªs).`);
      else
        horasPorMes.push('EvoluÃ§Ã£o estÃ¡vel: variaÃ§Ã£o inferior a 5% entre os Ãºltimos 6 meses analisados.');
    }
    const totalPerd = meses.reduce((a, m) => a + m.perdidas, 0);
    horasPorMes.push(totalPerd > 0
      ? `${totalPerd.toFixed(1)}h perdidas no perÃ­odo â€” reduÃ§Ã£o possÃ­vel com melhor planejamento de folgas.`
      : 'Nenhuma hora perdida no perÃ­odo â€” excelente aproveitamento do banco de horas.');
  }

  return { resumoGeral, topServidores, saldoPorSetor, horasPorMes };
}

// â”€â”€â”€ Drawing primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Renders an insight callout box; returns the y position after the box. */
function insightBox(doc: jsPDF, lines: string[], x: number, y: number, w: number): number {
  const padding = 5;
  const titleH  = 8;
  const lh      = 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const allWrapped: string[] = lines.flatMap(line =>
    doc.splitTextToSize(`â€¢ ${line}`, w - 14) as string[]
  );
  const boxH = padding + titleH + allWrapped.length * lh + padding;

  doc.setFillColor(...C.g50);
  doc.roundedRect(x, y, w, boxH, 3, 3, 'F');
  doc.setFillColor(...C.g700);
  doc.roundedRect(x, y, 3.5, boxH, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.g800);
  doc.text('InterpretaÃ§Ã£o AutomÃ¡tica', x + 8, y + padding + 3);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.s700);
  let ty = y + padding + titleH;
  for (const wline of allWrapped) {
    doc.text(wline, x + 8, ty);
    ty += lh;
  }

  return y + boxH + 6;
}

/** Horizontal bar chart for saldo por setor. */
function drawBarChartH(
  doc: jsPDF,
  data: { label: string; value: number }[],
  x: number, y: number, w: number, h: number,
) {
  if (data.length === 0) return;
  const maxAbs      = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const labelW      = w * 0.40;
  const barAreaW    = w * 0.48;
  const valW        = w * 0.12;
  const rowH        = Math.min(7.5, (h - 8) / data.length - 1.5);
  const rowSpacing  = (h - 8) / data.length;
  const zeroX       = x + labelW;

  // Y axis line
  doc.setDrawColor(...C.s200);
  doc.setLineWidth(0.25);
  doc.line(zeroX, y, zeroX, y + h - 4);

  for (const [i, item] of data.entries()) {
    const ry       = y + i * rowSpacing + 1;
    const barW     = Math.max(1, (Math.abs(item.value) / maxAbs) * barAreaW);
    const positive = item.value >= 0;
    const barColor = positive ? C.g700 : C.red;
    const barStartX = positive ? zeroX : zeroX - barW;

    // Row bg stripe (alternating)
    if (i % 2 === 0) {
      doc.setFillColor(...C.s100);
      doc.rect(x, ry, w, rowSpacing, 'F');
    }

    // Sector label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.s700);
    const labelText = item.label.length > 32 ? item.label.substring(0, 30) + 'â€¦' : item.label;
    doc.text(labelText, zeroX - 2, ry + rowH / 2 + 2, { align: 'right' });

    // Bar
    doc.setFillColor(...barColor);
    doc.roundedRect(barStartX, ry + 0.5, barW, rowH - 1, 1, 1, 'F');

    // Value label
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...barColor);
    const valText = `${item.value > 0 ? '+' : ''}${item.value}h`;
    doc.text(valText, positive ? zeroX + barW + 1.5 : zeroX - barW - 1.5, ry + rowH / 2 + 2, {
      align: positive ? 'left' : 'right',
    });
  }
}

/** Mini line chart for monthly horas data. */
function drawLineChartMonths(
  doc: jsPDF,
  data: { month: string; liquidadas: number; direito: number; perdidas: number }[],
  x: number, y: number, w: number, h: number,
) {
  if (data.length === 0) return;

  const padL = 20, padB = 16, padT = 6, padR = 6;
  const cx = x + padL, cy = y + padT;
  const cw = w - padL - padR, ch = h - padT - padB;

  const maxVal = Math.max(...data.flatMap(d => [d.liquidadas, d.direito, d.perdidas]), 1);

  // Chart background
  doc.setFillColor(...C.s100);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');

  // Grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const gy = cy + ch - (i / gridLines) * ch;
    doc.setDrawColor(...C.s200);
    doc.setLineWidth(0.15);
    doc.line(cx, gy, cx + cw, gy);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.s500);
    doc.text(String(Math.round((i / gridLines) * maxVal)), cx - 1.5, gy + 1.5, { align: 'right' });
  }

  // X-axis labels (skip some if too many months)
  const step = cw / Math.max(data.length - 1, 1);
  const showEvery = data.length > 10 ? 3 : data.length > 6 ? 2 : 1;
  data.forEach((d, i) => {
    if (i % showEvery !== 0 && i !== data.length - 1) return;
    const px = cx + i * step;
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.s500);
    doc.text(monthLabel(d.month), px, cy + ch + 5.5, { align: 'center' });
    doc.setDrawColor(...C.s200);
    doc.setLineWidth(0.15);
    doc.line(px, cy + ch, px, cy + ch + 1.5);
  });

  // Draw a series line
  const drawSeries = (values: number[], color: RGB, dashed: boolean) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.7);
    if (dashed) doc.setLineDashPattern([1.5, 1], 0);
    else doc.setLineDashPattern([], 0);

    let prev: { px: number; py: number } | null = null;
    values.forEach((v, i) => {
      const px = cx + i * step;
      const py = cy + ch - (v / maxVal) * ch;
      if (prev) doc.line(prev.px, prev.py, px, py);
      doc.setFillColor(...color);
      doc.circle(px, py, 0.9, 'F');
      prev = { px, py };
    });
    doc.setLineDashPattern([], 0);
  };

  drawSeries(data.map(d => d.liquidadas), C.g700,  false);
  drawSeries(data.map(d => d.direito),    C.amber, true);
  drawSeries(data.map(d => d.perdidas),   C.red,   true);

  // Legend (bottom-right inside chart)
  const legendItems = [
    { label: 'Liquidadas', color: C.g700,  dash: false },
    { label: 'Direito',    color: C.amber, dash: true },
    { label: 'Perdidas',   color: C.red,   dash: true },
  ];
  const legendBaseY = y + h - 3;
  legendItems.forEach((item, i) => {
    const lx = x + padL + i * 48;
    doc.setFillColor(...item.color);
    doc.rect(lx, legendBaseY - 2.5, 6, 2, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    doc.text(item.label, lx + 7.5, legendBaseY);
  });
}

// â”€â”€â”€ Page decorators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function addPageHeader(doc: jsPDF, logoData: string | null, W: number, subtitle: string) {
  doc.setFillColor(...C.g900);
  doc.rect(0, 0, W, 26, 'F');
  doc.setFillColor(...C.g600);
  doc.rect(0, 23, W, 3, 'F');

  if (logoData) doc.addImage(logoData, 'PNG', 8, 4, 15, 15);

  doc.setTextColor(...C.white);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('IPAJM â€” RelatÃ³rio Gerencial Â· Banco de Horas', 27, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 215, 178);
  doc.text(subtitle, 27, 19);
}

function addPageFooter(doc: jsPDF, W: number, H: number) {
  doc.setFillColor(...C.s100);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setDrawColor(...C.s200);
  doc.setLineWidth(0.3);
  doc.line(0, H - 12, W, H - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.s500);
  doc.text(
    'Instituto de PrevidÃªncia dos Servidores do Estado do EspÃ­rito Santo â€” IPAJM',
    W / 2, H - 6.5, { align: 'center' }
  );
  doc.text(`Gerado em: ${formatDateTime()}`, W / 2, H - 2, { align: 'center' });
}

function sectionTitle(doc: jsPDF, title: string, x: number, y: number, w: number) {
  // Main bar
  doc.setFillColor(...C.g900);
  doc.roundedRect(x, y, w, 8, 2, 2, 'F');
  // Right accent
  doc.setFillColor(...C.g600);
  doc.roundedRect(x + w - 10, y, 10, 8, 2, 2, 'F');
  doc.setFillColor(...C.g900);
  doc.rect(x + w - 15, y, 10, 8, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 5, y + 5.5);
}

// â”€â”€â”€ Main export function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function exportRelatorioGerencialPDF(
  dashboard: GerencialDashboard,
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();  // 210
  const H = doc.internal.pageSize.getHeight(); // 297

  const logoUrl  = `${window.location.origin}/assets/logo-ipajm-noText.png`;
  const logoData = await loadImageAsDataUrl(logoUrl);
  const insights = generateInsights(dashboard);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 1 â€” Cover (two-tone: dark sidebar + white content)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const SB = 68; // sidebar width

  // Sidebar background
  doc.setFillColor(...C.g900);
  doc.rect(0, 0, SB, H, 'F');

  // Sidebar accent strip (right edge)
  doc.setFillColor(...C.g700);
  doc.rect(SB - 3.5, 0, 3.5, H, 'F');

  // Decorative circles in sidebar
  doc.setFillColor(0, 65, 20);
  doc.circle(SB / 2, H - 38, 52, 'F');
  doc.setFillColor(0, 58, 15);
  doc.circle(8, 22, 28, 'F');

  // Logo
  if (logoData) {
    doc.addImage(logoData, 'PNG', SB / 2 - 17, 30, 34, 34);
  } else {
    doc.setFillColor(0, 95, 30);
    doc.circle(SB / 2, 47, 18, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('IPAJM', SB / 2, 51, { align: 'center' });
  }

  // "IPAJM" acronym
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('IPAJM', SB / 2, 80, { align: 'center' });

  // Subtitle lines
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 215, 178);
  ['Instituto de PrevidÃªncia', 'dos Servidores do ES'].forEach((line, i) =>
    doc.text(line, SB / 2, 88 + i * 5.5, { align: 'center' })
  );

  // Divider
  doc.setDrawColor(0, 105, 38);
  doc.setLineWidth(0.35);
  doc.line(10, 104, SB - 14, 104);

  // Module name
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  ['BANCO', 'DE HORAS', 'GERENCIAL'].forEach((word, i) =>
    doc.text(word, SB / 2, 116 + i * 9, { align: 'center' })
  );

  // Year badge
  doc.setFillColor(0, 100, 35);
  doc.roundedRect(SB / 2 - 15, 148, 30, 10, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(String(new Date().getFullYear()), SB / 2, 155, { align: 'center' });

  // Generated date (sidebar bottom)
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 200, 155);
  doc.text('Gerado em', SB / 2, H - 15, { align: 'center' });
  doc.text(formatDateTime(), SB / 2, H - 10, { align: 'center' });

  // Right content area
  doc.setFillColor(...C.white);
  doc.rect(SB, 0, W - SB, H, 'F');

  // Right header band (light green tint)
  doc.setFillColor(236, 249, 239);
  doc.rect(SB, 0, W - SB, 55, 'F');

  const rx = SB + 10;
  const rw = W - SB - 18;

  // Institution subtitle
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.s500);
  doc.text('SubgerÃªncia de Recursos Humanos', rx, 13);

  // Report title
  doc.setFontSize(21);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.g900);
  doc.text('RelatÃ³rio', rx, 28);
  doc.setFontSize(21);
  doc.text('Gerencial', rx, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.s500);
  doc.text('Banco de Horas dos Servidores', rx, 47);

  // Period badge
  doc.setFillColor(...C.g900);
  doc.roundedRect(rx, 58, rw, 10, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(
    `PerÃ­odo: ${formatDate(dateFrom)} â€” ${formatDate(dateTo)}`,
    rx + rw / 2, 64.5, { align: 'center' }
  );

  // Summary stat cards (3 Ã— 2)
  const sum = dashboard.summary;
  const saldoMins = parseHhmm(sum.saldo_total_hhmm);
  const cardData = [
    { label: 'Servidores',     value: String(sum.total_servidores),        accent: C.g700 },
    { label: 'Registros',      value: String(sum.registros_horas),         accent: C.g700 },
    { label: 'H. Trabalhadas', value: sum.horas_trabalhadas_hhmm + 'h',    accent: C.g700 },
    { label: 'H. Direito',     value: sum.horas_direito_hhmm + 'h',        accent: C.amber },
    { label: 'H. Gozadas',     value: sum.horas_gozadas_hhmm + 'h',        accent: C.amber },
    { label: 'Saldo Total',    value: sum.saldo_total_hhmm + 'h',          accent: saldoMins >= 0 ? C.g700 : C.red },
  ];
  const cW = (rw - 4) / 3;
  const cH = 22;
  cardData.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx2 = rx + col * (cW + 2);
    const cy2 = 74 + row * (cH + 3);

    doc.setFillColor(...C.s100);
    doc.roundedRect(cx2, cy2, cW, cH, 2.5, 2.5, 'F');
    doc.setFillColor(...card.accent);
    doc.roundedRect(cx2, cy2, 3, cH, 1.5, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.s500);
    doc.text(card.label, cx2 + 6, cy2 + 8);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.accent);
    doc.text(card.value, cx2 + 6, cy2 + 17);
  });

  // Cover insight box
  const insightStartY = 74 + 2 * (cH + 3) + 8;
  insightBox(doc, insights.resumoGeral, rx, insightStartY, rw);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 2 â€” Top Servidores + Saldo por Setor
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  doc.addPage();
  addPageHeader(doc, logoData, W, 'AnÃ¡lise de Servidores e Setores');
  let y = 32;

  sectionTitle(doc, 'Top 10 Servidores por Saldo Acumulado', 14, y, W - 28);
  y += 10;

  y = insightBox(doc, insights.topServidores, 14, y, W - 28);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Servidor', 'Setor', 'Saldo']],
    body: dashboard.top_servidores.map((s, i) => [
      `${i + 1}Âº`,
      toTitleCase(s.nome),
      s.setor,
      s.saldo_hhmm + 'h',
    ]),
    theme: 'grid',
    headStyles: { fillColor: C.g900, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: C.slate },
    alternateRowStyles: { fillColor: C.s100 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 45, halign: 'center' },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = String(data.cell.raw ?? '').replace('h', '');
        const mins = parseHhmm(raw);
        if (mins < 0) {
          data.cell.styles.fillColor = C.r100;
          data.cell.styles.textColor = C.red;
        } else if (mins > 0) {
          data.cell.styles.fillColor = C.g50;
          data.cell.styles.textColor = C.g700;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // New page if not enough space
  if (y > H - 100) {
    doc.addPage();
    addPageHeader(doc, logoData, W, 'Saldo por Setor');
    y = 32;
  }

  sectionTitle(doc, 'Saldo por Setor', 14, y, W - 28);
  y += 10;
  y = insightBox(doc, insights.saldoPorSetor, 14, y, W - 28);

  // Bar chart
  const barData = dashboard.saldo_por_setor.map(s => ({ label: s.setor, value: s.saldo }));
  const barH = Math.min(75, barData.length * 10 + 14);
  if (barData.length > 0 && y + barH < H - 55) {
    drawBarChartH(doc, barData, 14, y, W - 28, barH);
    y += barH + 6;
  }

  autoTable(doc, {
    startY: y,
    head: [['Setor', 'Saldo (horas)']],
    body: dashboard.saldo_por_setor.map(s => [s.setor, `${s.saldo}h`]),
    theme: 'grid',
    headStyles: { fillColor: C.g900, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: C.slate },
    alternateRowStyles: { fillColor: C.s100 },
    columnStyles: {
      0: { cellWidth: 135 },
      1: { cellWidth: 37, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const val = parseFloat(String(data.cell.raw ?? '').replace('h', ''));
        if (!isNaN(val)) {
          if (val < 0) { data.cell.styles.fillColor = C.r100; data.cell.styles.textColor = C.red; }
          else          { data.cell.styles.fillColor = C.g50;  data.cell.styles.textColor = C.g700; }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooter(doc, W, H);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 3 â€” EvoluÃ§Ã£o Mensal
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  doc.addPage();
  addPageHeader(doc, logoData, W, 'EvoluÃ§Ã£o Mensal do Banco de Horas');
  y = 32;

  sectionTitle(doc, 'EvoluÃ§Ã£o de Horas por MÃªs', 14, y, W - 28);
  y += 10;
  y = insightBox(doc, insights.horasPorMes, 14, y, W - 28);

  // Line chart
  if (dashboard.horas_por_mes.length > 1) {
    drawLineChartMonths(doc, dashboard.horas_por_mes, 14, y, W - 28, 68);
    y += 75;
  }

  autoTable(doc, {
    startY: y,
    head: [['MÃªs', 'H. Liquidadas', 'H. Direito', 'H. Perdidas']],
    body: dashboard.horas_por_mes.map(m => {
      const [yr, mo] = m.month.split('-');
      return [`${MONTHS_PT[parseInt(mo) - 1] ?? mo}/${yr.slice(2)}`, `${m.liquidadas}h`, `${m.direito}h`, `${m.perdidas}h`];
    }),
    theme: 'grid',
    headStyles: { fillColor: C.g900, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: C.slate },
    alternateRowStyles: { fillColor: C.s100 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55, halign: 'center' },
      2: { cellWidth: 55, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = parseFloat(String(data.cell.raw ?? '').replace('h', ''));
        if (!isNaN(val) && val > 0) {
          data.cell.styles.fillColor = C.r100;
          data.cell.styles.textColor = C.red;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooter(doc, W, H);

  // Page numbers on interior pages
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 3;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.s500);
    doc.text(`${i} / ${totalPages}`, W - 15, H - 6.5, { align: 'right' });
  }

  doc.save(`relatorio-gerencial-${dateFrom}_${dateTo}.pdf`);
}
