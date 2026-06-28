// PDF generation for the Anlage V (Einkünfte aus Vermietung und Verpachtung)
// summary using pdf-lib loaded from CDN. The output is a clean, line-mapped
// overview that the landlord can transcribe into ELSTER / the official form.
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

export interface AnlageVLine {
  /** Official Anlage V line number, e.g. "9", "33", "50". */
  zeile?: string | null;
  label: string;
  amount: number;
  /** Optional sub-note shown in gray after the label (e.g. AfA basis). */
  note?: string | null;
}

export interface AnlageVPdfData {
  year: number;
  ownerName?: string | null;
  taxNumber?: string | null;
  propertyName: string;
  propertyAddress?: string | null;
  ownershipSharePct: number; // 0-100
  income: AnlageVLine[];
  totalIncome: number;
  deductions: AnlageVLine[];
  totalDeductions: number;
  /** Result for the whole property (income - deductions, after any §21 limitation). */
  result: number;
  /** Result attributable to this owner (result × ownershipSharePct). */
  ownerResult: number;
  deductibleFactorPct: number; // 100 unless §21(2) limitation applies
  warnings?: string[];
}

function formatEur(v: number): string {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function germanDate(): string {
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

export async function generateAnlageVPdf(data: AnlageVPdfData): Promise<Uint8Array> {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const doc  = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4

  const fontR = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const L = 57;
  const R = width - 55;
  const colAmt = R;            // right edge for amounts
  const colZeile = L;          // Zeile number column
  const colLabel = L + 42;     // label column

  const gray      = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.78, 0.78, 0.78);
  const black     = rgb(0, 0, 0);
  const blue      = rgb(0.1, 0.25, 0.6);
  const lightBlue = rgb(0.88, 0.92, 0.97);
  const amber     = rgb(0.6, 0.4, 0.05);
  const green     = rgb(0.1, 0.45, 0.2);

  const drawRight = (text: string, x: number, y: number, font: any, size: number, color: any) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: x - w, y, font, size, color });
  };

  // ── Header ────────────────────────────────────────────────────────────────
  let y = height - 56;
  page.drawText("Anlage V", { x: L, y, font: fontB, size: 18, color: blue });
  drawRight(germanDate(), R, y + 2, fontR, 9, black);
  y -= 18;
  page.drawText(`Einkünfte aus Vermietung und Verpachtung — ${data.year}`, { x: L, y, font: fontR, size: 10, color: gray });
  y -= 10;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.6, color: lightGray });
  y -= 22;

  // ── Property / owner block ──────────────────────────────────────────────────
  const infoRow = (label: string, value: string) => {
    page.drawText(label, { x: L, y, font: fontR, size: 8.5, color: gray });
    page.drawText(value, { x: L + 120, y, font: fontB, size: 9, color: black });
    y -= 14;
  };
  infoRow("Objekt", data.propertyName ?? "—");
  if (data.propertyAddress) infoRow("Anschrift", data.propertyAddress);
  if (data.ownerName) infoRow("Eigentümer/in", data.ownerName);
  if (data.taxNumber) infoRow("Steuernummer", data.taxNumber);
  infoRow("Anteil (%)", `${data.ownershipSharePct}`.replace(".", ","));
  y -= 6;

  // ── Section renderer ────────────────────────────────────────────────────────
  const sectionHeader = (title: string) => {
    page.drawRectangle({ x: L, y: y - 4, width: R - L, height: 18, color: lightBlue });
    page.drawText(title, { x: L + 4, y: y + 1, font: fontB, size: 9.5, color: blue });
    drawRight("Betrag (€)", R - 4, y + 1, fontB, 8, blue);
    y -= 24;
  };

  const lineRow = (line: AnlageVLine) => {
    if (line.zeile) page.drawText(`Z. ${line.zeile}`, { x: colZeile, y, font: fontR, size: 7.5, color: gray });
    page.drawText(line.label, { x: colLabel, y, font: fontR, size: 9, color: black });
    if (line.note) {
      const lw = fontR.widthOfTextAtSize(line.label, 9);
      page.drawText(line.note, { x: colLabel + lw + 6, y, font: fontR, size: 7.5, color: gray });
    }
    drawRight(formatEur(line.amount), colAmt - 4, y, fontR, 9, black);
    y -= 15;
  };

  const totalRow = (label: string, amount: number, color = black) => {
    page.drawLine({ start: { x: colLabel, y: y + 11 }, end: { x: R, y: y + 11 }, thickness: 0.4, color: lightGray });
    page.drawText(label, { x: colLabel, y, font: fontB, size: 9.5, color });
    drawRight(`€ ${formatEur(amount)}`, colAmt - 4, y, fontB, 9.5, color);
    y -= 20;
  };

  // ── Income ──────────────────────────────────────────────────────────────────
  sectionHeader("Einnahmen");
  if (data.income.length === 0) {
    page.drawText("Keine Einnahmen erfasst.", { x: colLabel, y, font: fontR, size: 9, color: gray });
    y -= 15;
  } else {
    data.income.forEach(lineRow);
  }
  totalRow("Summe der Einnahmen", data.totalIncome, blue);

  // ── Deductions ──────────────────────────────────────────────────────────────
  sectionHeader("Werbungskosten");
  if (data.deductions.length === 0) {
    page.drawText("Keine Werbungskosten erfasst.", { x: colLabel, y, font: fontR, size: 9, color: gray });
    y -= 15;
  } else {
    data.deductions.forEach(lineRow);
  }
  if (data.deductibleFactorPct < 100) {
    page.drawText(
      `Abziehbar nach §21 Abs. 2 EStG: ${`${data.deductibleFactorPct}`.replace(".", ",")} %`,
      { x: colLabel, y, font: fontR, size: 7.5, color: amber },
    );
    y -= 13;
  }
  totalRow("Summe der Werbungskosten", data.totalDeductions, blue);

  // ── Result ──────────────────────────────────────────────────────────────────
  y -= 4;
  const resultPositive = data.result >= 0;
  page.drawRectangle({
    x: L, y: y - 22, width: R - L, height: 30,
    color: resultPositive ? rgb(0.99, 0.97, 0.9) : rgb(0.92, 0.97, 0.93),
    borderColor: resultPositive ? amber : green, borderWidth: 0.8,
  });
  page.drawText(resultPositive ? "Überschuss (Einkünfte)" : "Verlust (Einkünfte)", {
    x: L + 6, y: y - 12, font: fontB, size: 10.5, color: resultPositive ? amber : green,
  });
  drawRight(`€ ${formatEur(data.result)}`, R - 6, y - 12, fontB, 12, resultPositive ? amber : green);
  y -= 34;

  if (data.ownershipSharePct !== 100) {
    page.drawText(`Ihr Anteil (${`${data.ownershipSharePct}`.replace(".", ",")} %)`, {
      x: L + 6, y, font: fontB, size: 9, color: black,
    });
    drawRight(`€ ${formatEur(data.ownerResult)}`, R - 6, y, fontB, 9.5, black);
    y -= 18;
  }

  // ── Warnings ────────────────────────────────────────────────────────────────
  if (data.warnings && data.warnings.length > 0) {
    y -= 6;
    page.drawText("Hinweise", { x: L, y, font: fontB, size: 9, color: amber });
    y -= 14;
    for (const wn of data.warnings) {
      const wrapped = wrapText(wn, fontR, 8.5, R - L - 12);
      for (const ln of wrapped) {
        page.drawText(`• ${ln}`, { x: L + 2, y, font: fontR, size: 8.5, color: amber });
        y -= 12;
      }
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: L, y: 60 }, end: { x: R, y: 60 }, thickness: 0.4, color: lightGray });
  page.drawText(
    "Unverbindliche Aufstellung — ersetzt keine Steuerberatung. Beträge zur Übertragung in die Anlage V (ELSTER).",
    { x: L, y: 48, font: fontR, size: 7, color: gray },
  );

  return await doc.save();
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
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
