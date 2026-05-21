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
}

export interface BillingData {
  senderName: string;
  senderAddress: string;
  city: string;
  recipientName: string;
  propertyName: string;
  propertyAddress: string;
  apartmentCode: string;
  year: number;
  iban: string;
  bankName: string;
  costLines: CostLineItem[];
  prepayment: number;
}

function formatEur(v: number): string {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function germanDate(): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

// pdf-lib standard fonts cover Latin-1 Supplement (German umlauts, ß).
export async function generateBillingPdf(data: BillingData): Promise<Uint8Array> {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const left   = 60;
  const right  = width - 60;
  const gray   = rgb(0.5, 0.5, 0.5);
  const black  = rgb(0, 0, 0);
  const blue   = rgb(0.1, 0.25, 0.6);

  let y = height - 56;

  // ── Sender line ────────────────────────────────────────────────────────────
  page.drawText(`${data.senderName} | ${data.senderAddress}`, {
    x: left, y, font: fontRegular, size: 7, color: gray,
  });
  y -= 14;

  // ── Horizontal rule ────────────────────────────────────────────────────────
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: gray });
  y -= 20;

  // ── Recipient address (left) + Date (right) ────────────────────────────────
  const dateStr = `${data.city}, ${germanDate()}`;
  const dateW   = fontRegular.widthOfTextAtSize(dateStr, 10);
  page.drawText(dateStr, { x: right - dateW, y, font: fontRegular, size: 10, color: black });

  page.drawText(data.recipientName, { x: left, y, font: fontBold, size: 10, color: black });
  y -= 14;
  page.drawText(data.propertyAddress, { x: left, y, font: fontRegular, size: 10, color: black });
  y -= 28;

  // ── Subject ────────────────────────────────────────────────────────────────
  page.drawText(
    `Nebenkostenabrechnung ${data.year} — Wohnung ${data.apartmentCode}`,
    { x: left, y, font: fontBold, size: 11, color: blue },
  );
  y -= 22;

  // ── Greeting ───────────────────────────────────────────────────────────────
  page.drawText(`Sehr geehrte(r) ${data.recipientName},`, {
    x: left, y, font: fontRegular, size: 10, color: black,
  });
  y -= 16;

  // ── Body text ──────────────────────────────────────────────────────────────
  const bodyLines = [
    `hiermit erhalten Sie die Betriebskostenabrechnung gemäß §556 BGB Abs. 3`,
    `für das Abrechnungsjahr ${data.year} (${data.year}.01.01 – ${data.year}.12.31).`,
  ];
  for (const line of bodyLines) {
    page.drawText(line, { x: left, y, font: fontRegular, size: 10, color: black });
    y -= 14;
  }
  y -= 10;

  // ── Cost table ─────────────────────────────────────────────────────────────
  const colName  = left;
  const colTotal = left + 270;
  const colShare = left + 390;
  const rowH     = 18;

  // Table header
  page.drawRectangle({ x: left, y: y - 4, width: right - left, height: rowH, color: rgb(0.93, 0.95, 0.98) });
  page.drawText("Abrechnungsposten", { x: colName + 4,  y: y + 2, font: fontBold, size: 9, color: blue });
  page.drawText("Gesamtkosten",       { x: colTotal + 4, y: y + 2, font: fontBold, size: 9, color: blue });
  page.drawText("Ihr Anteil",          { x: colShare + 4, y: y + 2, font: fontBold, size: 9, color: blue });
  y -= rowH;

  // Cost rows
  let totalShare = 0;
  let totalAll   = 0;
  for (const line of data.costLines) {
    const shareVal = line.share;
    const totalVal = line.total ?? 0;
    totalShare += shareVal;
    totalAll   += totalVal;

    page.drawLine({ start: { x: left, y: y + rowH - 2 }, end: { x: right, y: y + rowH - 2 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
    page.drawText(line.name,                               { x: colName + 4,  y: y + 4, font: fontRegular, size: 9, color: black });
    page.drawText(line.total != null ? `€ ${formatEur(totalVal)}` : "—", { x: colTotal + 4, y: y + 4, font: fontRegular, size: 9, color: black });
    page.drawText(`€ ${formatEur(shareVal)}`,              { x: colShare + 4, y: y + 4, font: fontRegular, size: 9, color: black });
    y -= rowH;
  }

  // ── Summary rows ───────────────────────────────────────────────────────────
  const summaryRows: Array<{ label: string; value: string; bold?: boolean; highlight?: boolean }> = [
    { label: "Gesamtkosten Nebenkosten", value: `€ ${formatEur(totalShare)}` },
    { label: "Abzüglich Vorauszahlungen", value: `€ ${formatEur(data.prepayment)}` },
  ];

  const net    = totalShare - data.prepayment;
  const refund = net < 0;
  summaryRows.push({
    label:     refund ? "Guthaben" : "Nachzahlung",
    value:     `€ ${formatEur(Math.abs(net))}`,
    bold:      true,
    highlight: true,
  });

  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.8, color: gray });
  y -= 4;

  for (const row of summaryRows) {
    if (row.highlight) {
      page.drawRectangle({ x: left, y: y - 4, width: right - left, height: rowH, color: rgb(0.93, 0.95, 0.98) });
    }
    const f = row.bold ? fontBold : fontRegular;
    const c = row.bold ? blue : black;
    page.drawText(row.label, { x: colName + 4, y: y + 4, font: f, size: 9, color: c });
    const vw = f.widthOfTextAtSize(row.value, 9);
    page.drawText(row.value, { x: right - 4 - vw, y: y + 4, font: f, size: 9, color: c });
    y -= rowH;
  }

  y -= 18;

  // ── Payment instructions ───────────────────────────────────────────────────
  if (!refund) {
    page.drawText(
      `Wir bitten Sie, den Betrag von € ${formatEur(net)} auf das folgende Konto zu überweisen:`,
      { x: left, y, font: fontRegular, size: 10, color: black },
    );
  } else {
    page.drawText(
      `Wir werden den Betrag von € ${formatEur(Math.abs(net))} auf Ihr Konto erstatten.`,
      { x: left, y, font: fontRegular, size: 10, color: black },
    );
  }
  y -= 18;

  // ── IBAN / Bank ────────────────────────────────────────────────────────────
  page.drawText(`IBAN: ${data.iban}`, { x: left, y, font: fontBold, size: 10, color: black });
  y -= 14;
  if (data.bankName) {
    page.drawText(`Bank: ${data.bankName}`, { x: left, y, font: fontRegular, size: 10, color: black });
    y -= 14;
  }
  y -= 20;

  // ── Closing ────────────────────────────────────────────────────────────────
  page.drawText("Mit freundlichen Grüßen", { x: left, y, font: fontRegular, size: 10, color: black });
  y -= 40;
  page.drawLine({ start: { x: left, y }, end: { x: left + 140, y }, thickness: 0.5, color: gray });
  y -= 12;
  page.drawText(data.senderName, { x: left, y, font: fontRegular, size: 9, color: gray });

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
