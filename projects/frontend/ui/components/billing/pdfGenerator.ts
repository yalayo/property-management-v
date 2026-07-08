// PDF generation for Nebenkostenabrechnung using pdf-lib loaded from CDN.
// pdf-lib UMD build exposes window.PDFLib.

const PDF_LIB_VERSION = "1.17.1";
const PDF_LIB_CDN = `https://cdn.jsdelivr.net/npm/pdf-lib@${PDF_LIB_VERSION}/dist/pdf-lib.min.js`;

let pdfLibPromise: Promise<any> | null = null;

function loadPdfLib(): Promise<any> {
  if (pdfLibPromise) return pdfLibPromise;
  const w = window as any;
  if (w.PDFLib) return Promise.resolve(w.PDFLib);
  pdfLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDF_LIB_CDN;
    script.onload = () => resolve((window as any).PDFLib);
    script.onerror = () => reject(new Error("Failed to load pdf-lib"));
    document.head.appendChild(script);
  });
  return pdfLibPromise;
}

export interface CostLineItem {
  name: string;
  total: number | null;
  share: number;
  verteiler?: number | string | null;
  schluessel?: string | null;
  anteil?: number | string | null;
}

export interface BillingData {
  senderName: string;
  senderStreet?: string;
  senderPostalCity?: string;
  senderAddress: string;
  city: string;
  recipientName: string;
  recipientStreet?: string;
  recipientPostalCity?: string;
  propertyName: string;
  propertyAddress: string;
  apartmentCode: string;
  year: number;
  iban: string;
  bankName: string;
  costLines: CostLineItem[];
  prepayment: number;
  closingName?: string;
  billingDays?: number;
  personCount?: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

function formatEur(v: number): string {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function germanDate(): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export async function generateBillingPdf(data: BillingData): Promise<Uint8Array> {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const doc  = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4

  const fontR = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const L = 57;          // left margin (≈20mm, DIN envelope window left edge)
  const R = width - 55;  // right margin

  const gray      = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.75, 0.75, 0.75);
  const black     = rgb(0, 0, 0);
  const blue      = rgb(0.1, 0.25, 0.6);
  const lightBlue = rgb(0.88, 0.92, 0.97);

  // ── Date + return address on the same line (top) ─────────────────────────
  const topY = height - 52;
  const dateStr = `${data.city}, ${germanDate()}`;
  const dateW   = fontR.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, { x: R - dateW, y: topY, font: fontR, size: 9, color: black });

  const senderAddrParts = [data.senderStreet, data.senderPostalCity].filter(Boolean);
  const senderLabel = data.closingName ?? data.senderName;
  const closingLine = senderAddrParts.length > 0
    ? `${senderLabel} - ${senderAddrParts.join(" ")}`
    : senderLabel;
  page.drawText(closingLine, { x: L, y: topY, font: fontR, size: 7, color: blue });
  page.drawLine({
    start: { x: L, y: topY - 5 }, end: { x: L + 240, y: topY - 5 },
    thickness: 0.3, color: lightGray,
  });

  // ── Envelope window position (DIN 5008: 45–85mm from top) ────────────────
  const windowTop = height - 127;

  // ── Recipient address (DIN 5008 envelope window: 45–85mm from top) ───────
  let ry = windowTop - 16;
  page.drawText(data.recipientName, { x: L, y: ry, font: fontB, size: 10.5, color: black });
  ry -= 14;
  if (data.recipientStreet) {
    page.drawText(data.recipientStreet, { x: L, y: ry, font: fontR, size: 10, color: black });
    ry -= 13;
  }
  if (data.recipientPostalCity) {
    page.drawText(data.recipientPostalCity, { x: L, y: ry, font: fontR, size: 10, color: black });
  }

  // ── Info table (right side, aligned with address window) ─────────────────
  const tL = 315;               // table left
  const tR = R;                 // table right
  const tW = tR - tL;           // table width
  const lX = tL + 4;            // label x
  const vX = tL + 100;          // value x
  const rH = 15;                // row height

  const billingDays = data.billingDays ?? (isLeapYear(data.year) ? 366 : 365);
  const personCount = data.personCount ?? 1;

  const infoRows: Array<{ label: string; value: string; header?: boolean }> = [
    { label: "Objekt",                  value: data.propertyName ?? "",      header: true },
    { label: "Wohnung",                  value: data.apartmentCode },
    { label: "Zeitraum",                 value: `${data.billingPeriodStart ?? `01.01.${data.year}`} – ${data.billingPeriodEnd ?? `31.12.${data.year}`}` },
    { label: "Abrechnungstage",          value: String(billingDays) },
    { label: "Abrechnungstage×Pers.", value: String(billingDays * personCount) },
  ];

  const tableH  = infoRows.length * rH + 2;
  const tableTop = windowTop + 2;
  const tableBtm = tableTop - tableH;

  page.drawRectangle({
    x: tL, y: tableBtm, width: tW, height: tableH,
    color: rgb(1, 1, 1), borderColor: rgb(0.7, 0.75, 0.85), borderWidth: 0.5,
  });

  let iy = tableTop - 2;
  for (let i = 0; i < infoRows.length; i++) {
    const { label, value, header } = infoRows[i];
    if (header) {
      page.drawRectangle({ x: tL, y: iy - rH + 1, width: tW, height: rH, color: lightBlue });
    }
    if (label) {
      page.drawText(label, {
        x: lX, y: iy - rH + 4,
        font: header ? fontB : fontR,
        size: 7.5,
        color: header ? blue : gray,
      });
    }
    page.drawText(value, {
      x: vX, y: iy - rH + 4,
      font: header ? fontB : fontR,
      size: 7.5,
      color: header ? blue : black,
    });
    if (i < infoRows.length - 1) {
      page.drawLine({
        start: { x: tL, y: iy - rH + 1 }, end: { x: tR, y: iy - rH + 1 },
        thickness: 0.25, color: rgb(0.85, 0.87, 0.92),
      });
    }
    iy -= rH;
  }

  // ── Separator + date below header zone ───────────────────────────────────
  const contentY = Math.min(tableBtm, ry) - 16;

  page.drawLine({
    start: { x: L, y: contentY + 6 }, end: { x: R, y: contentY + 6 },
    thickness: 0.4, color: lightGray,
  });

  // ── Subject ───────────────────────────────────────────────────────────────
  let y = contentY - 12;
  page.drawText(
    `Nebenkostenabrechnung ${data.year}`,
    { x: L, y, font: fontB, size: 11, color: blue },
  );
  y -= 20;

  // ── Greeting + body ───────────────────────────────────────────────────────
  page.drawText(`Sehr geehrte(r) ${data.recipientName},`, { x: L, y, font: fontR, size: 9.5, color: black });
  y -= 14;
  const periodStart = data.billingPeriodStart ?? `01.01.${data.year}`;
  const periodEnd   = data.billingPeriodEnd   ?? `31.12.${data.year}`;
  const bodyLines = [
    `hiermit erhalten Sie die Betriebskostenabrechnung gemäß §556 BGB Abs. 3`,
    `für das Abrechnungsjahr ${data.year} (${periodStart} – ${periodEnd}).`,
  ];
  for (const line of bodyLines) {
    page.drawText(line, { x: L, y, font: fontR, size: 9.5, color: black });
    y -= 13;
  }
  y -= 10;

  // ── Cost table ────────────────────────────────────────────────────────────
  // 6 columns: Name | Gesamtkosten | Verteiler | Schlüssel | Anteil | Ihr Anteil
  const cName  = L;
  const cTotal = L + 138;
  const cVert  = L + 213;
  const cKey   = L + 272;
  const cAnt   = L + 337;
  const cShare = L + 388;
  const rowH   = 15;

  const hdrBtm = y - 4;
  page.drawRectangle({ x: L, y: hdrBtm, width: R - L, height: rowH + 2, color: lightBlue });

  const headers: Array<[string, number]> = [
    ["Abrechnungsposten", cName],
    ["Gesamtkosten",      cTotal],
    ["Verteiler",         cVert],
    ["Schlüssel",         cKey],
    ["Anteil",            cAnt],
    ["Ihr Anteil",        cShare],
  ];
  for (const [label, colX] of headers) {
    page.drawText(label, { x: colX + 3, y: y + 2, font: fontB, size: 7.5, color: blue });
  }
  y -= rowH + 2;

  let totalShare = 0;
  let totalPropertyCost = 0;
  for (const line of data.costLines) {
    totalShare += line.share;
    totalPropertyCost += line.total ?? 0;

    page.drawLine({
      start: { x: L, y: y + rowH - 1 }, end: { x: R, y: y + rowH - 1 },
      thickness: 0.25, color: rgb(0.88, 0.88, 0.88),
    });

    const str = (v: any) => (v != null && v !== "" ? String(v) : "—");
    page.drawText(line.name,                                                { x: cName  + 3, y: y + 3, font: fontR, size: 8, color: black });
    page.drawText(line.total != null ? `€ ${formatEur(line.total)}` : "—", { x: cTotal + 3, y: y + 3, font: fontR, size: 8, color: black });
    page.drawText(str(line.verteiler),                                      { x: cVert  + 3, y: y + 3, font: fontR, size: 8, color: black });
    page.drawText(str(line.schluessel),                                     { x: cKey   + 3, y: y + 3, font: fontR, size: 8, color: black });
    page.drawText(str(line.anteil),                                         { x: cAnt   + 3, y: y + 3, font: fontR, size: 8, color: black });
    page.drawText(`€ ${formatEur(line.share)}`,                             { x: cShare + 3, y: y + 3, font: fontR, size: 8, color: black });
    y -= rowH;
  }

  // ── Table totals row ──────────────────────────────────────────────────────
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.5, color: gray });
  y -= rowH - 2;
  page.drawText("Gesamt", { x: cName + 3, y: y + 3, font: fontB, size: 8, color: black });
  if (totalPropertyCost > 0) {
    const totalPropStr = `€ ${formatEur(totalPropertyCost)}`;
    page.drawText(totalPropStr, { x: cTotal + 3, y: y + 3, font: fontB, size: 8, color: black });
  }
  const totalShareStr = `€ ${formatEur(totalShare)}`;
  page.drawText(totalShareStr, { x: cShare + 3, y: y + 3, font: fontB, size: 8, color: black });
  y -= rowH;

  // ── Summary ───────────────────────────────────────────────────────────────
  y -= 4;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.7, color: gray });
  y -= 14;

  const net    = totalShare - data.prepayment;
  const refund = net < 0;

  const summaryRows: Array<{ label: string; value: string; bold?: boolean; highlight?: boolean }> = [
    { label: "Summe Nebenkosten",       value: `€ ${formatEur(totalShare)}` },
    { label: "Abzüglich Vorauszahlungen", value: `- € ${formatEur(data.prepayment)}` },
    { label: refund ? "Gutschrift" : "Nachzahlung", value: `€ ${formatEur(Math.abs(net))}`, bold: true, highlight: true },
  ];

  for (const row of summaryRows) {
    if (row.highlight) {
      page.drawRectangle({ x: L, y: y - 4, width: R - L, height: rowH + 2, color: lightBlue });
    }
    const f = row.bold ? fontB : fontR;
    const c = row.bold ? blue : black;
    page.drawText(row.label, { x: L + 3, y: y + 2, font: f, size: 8.5, color: c });
    const vw = f.widthOfTextAtSize(row.value, 8.5);
    page.drawText(row.value, { x: R - 3 - vw, y: y + 2, font: f, size: 8.5, color: c });
    y -= rowH + 2;
  }

  y -= 14;

  // ── Payment instructions ──────────────────────────────────────────────────
  if (!refund) {
    page.drawText(
      `Wir bitten Sie, den Betrag von € ${formatEur(net)} auf das folgende Konto zu überweisen:`,
      { x: L, y, font: fontR, size: 9.5, color: black },
    );
  } else {
    page.drawText(
      `Die Abrechnung schließt mit einer Gutschrift von € ${formatEur(Math.abs(net))} zu Ihren Gunsten.`,
      { x: L, y, font: fontR, size: 9.5, color: black },
    );
  }
  y -= 16;

  if (!refund) {
    page.drawText(`IBAN: ${data.iban}`, { x: L, y, font: fontB, size: 9.5, color: black });
    y -= 13;
    if (data.bankName) {
      page.drawText(`Bank: ${data.bankName}`, { x: L, y, font: fontR, size: 9.5, color: black });
      y -= 13;
    }
    y -= 18;
  } else {
    y -= 18;
  }

  // ── Closing ───────────────────────────────────────────────────────────────
  page.drawText("Mit freundlichen Grüßen", { x: L, y, font: fontR, size: 9.5, color: black });
  y -= 36;
  page.drawLine({ start: { x: L, y }, end: { x: L + 160, y }, thickness: 0.4, color: lightGray });
  y -= 12;
  page.drawText(data.closingName ?? data.senderName, { x: L, y, font: fontR, size: 9, color: black });

  return doc.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
