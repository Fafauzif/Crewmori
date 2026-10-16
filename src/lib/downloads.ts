import { sampleId, sha256Bytes } from "./local-crypto";
import { jsPDF } from "jspdf";
import { zipSync, strToU8 } from "fflate";

export function safeFilename(name: string): string {
  return (
    name
      .replace(/[\u0000-\u001f/\\:*?"<>|]/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 160) || "download"
  );
}
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename(filename);
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function downloadText(
  filename: string,
  text: string,
  type = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([text], { type }), filename);
}
function pdfText(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/’/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "-");
}
export function makePdf(
  title: string,
  rows: Array<[string, string]>,
  note = "Crewmori sample document. No real payment or external dispatch.",
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(245, 243, 236);
  doc.rect(0, 0, 210, 44, "F");
  doc.setTextColor(36, 92, 71);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CREWMORI", 20, 20);
  doc.setTextColor(32, 42, 37);
  doc.setFont("times", "normal");
  doc.setFontSize(23);
  doc.text(pdfText(title), 20, 34);
  let y = 56;
  for (const [key, value] of rows) {
    const lines = doc.splitTextToSize(pdfText(value), 112) as string[];
    const height = Math.max(8, lines.length * 5 + 4);
    if (y + height > 268) {
      doc.addPage();
      y = 24;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfText(key), 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, 75, y);
    y += height;
    doc.setDrawColor(217, 222, 211);
    doc.line(20, y - 3, 190, y - 3);
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(86, 97, 89);
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(pdfText(note), 170), 20, 281);
    doc.text(`${p} / ${pages}`, 190, 293, { align: "right" });
  }
  return doc.output("blob");
}
export function downloadPdf(
  filename: string,
  title: string,
  lines: string[],
): void {
  downloadBlob(
    makePdf(
      title,
      lines.map((line) => ["", line]),
    ),
    filename,
  );
}
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function csvBytes(headers: string[], rows: unknown[][]): Uint8Array {
  return strToU8(
    "\uFEFF" +
      [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
      "\r\n",
  );
}
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  downloadBlob(
    new Blob([csvBytes(headers, rows) as BlobPart], {
      type: "text/csv;charset=utf-8",
    }),
    filename,
  );
}
export function zipBytes(
  files: Record<string, Uint8Array | string>,
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, bytes] of Object.entries(files))
    entries[safeFilename(name)] =
      typeof bytes === "string" ? strToU8(bytes) : bytes;
  return zipSync(entries, { level: 6 });
}
export function downloadZip(
  filename: string,
  files: Record<string, Uint8Array | string>,
): void {
  downloadBlob(
    new Blob([zipBytes(files) as BlobPart], { type: "application/zip" }),
    filename,
  );
}
export function parseAmount(value: string, currency: string): number | null {
  const pattern = currency === "IDR" ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
  if (!["USD", "IDR"].includes(currency) || !pattern.test(value.trim()))
    return null;
  const [whole, decimals = ""] = value.trim().split(".");
  const amount =
    Number(whole) * (currency === "IDR" ? 1 : 100) +
    (currency === "IDR" ? 0 : Number(decimals.padEnd(2, "0")));
  return Number.isSafeInteger(amount) &&
    amount >= 0 &&
    amount <= 1_000_000_000_000
    ? amount
    : null;
}
export function displayAmount(amount: number, currency: string): string {
  return currency === "IDR" ? String(amount) : (amount / 100).toFixed(2);
}
export async function validateUpload(file: File): Promise<string | null> {
  if (file.size > 10_485_760) return `${file.name}: exceeds the 10 MiB limit.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    txt: "text/plain",
  };
  if (!ext || !allowed[ext] || file.type !== allowed[ext])
    return `${file.name}: choose a PDF, PNG, JPEG or TXT with a matching file type.`;
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const text = new TextDecoder().decode(head);
  if (ext === "pdf" && !text.startsWith("%PDF-"))
    return `${file.name}: its contents do not match a PDF.`;
  if (
    ext === "png" &&
    !(
      head[0] === 137 &&
      head[1] === 80 &&
      head[2] === 78 &&
      head[3] === 71 &&
      head[4] === 13 &&
      head[5] === 10 &&
      head[6] === 26 &&
      head[7] === 10
    )
  )
    return `${file.name}: its contents do not match a PNG.`;
  if (
    ["jpg", "jpeg"].includes(ext) &&
    !(head[0] === 255 && head[1] === 216 && head[2] === 255)
  )
    return `${file.name}: its contents do not match a JPEG.`;
  if (
    ext === "txt" &&
    (head.includes(0) || /<\s*(html|script|svg|!doctype)/i.test(text))
  )
    return `${file.name}: active or binary content cannot be stored as TXT.`;
  return null;
}
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
}
function uploadDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("crewmori-files-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Local file storage is unavailable. Your record was not changed.",
        ),
      );
  });
}
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  return sha256Bytes(bytes);
}
export async function persistUpload(file: File): Promise<UploadedFile> {
  const error = await validateUpload(file);
  if (error) throw new Error(error);
  const bytes = await file.arrayBuffer();
  const sha256 = await hashBytes(bytes);
  const id = sampleId("file");
  const db = await uploadDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    transaction.objectStore("files").put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new Error(
          "Could not save the file locally. Free browser storage and retry.",
        ),
      );
    transaction.onabort = () =>
      reject(
        new Error(
          "File storage was interrupted. Retry with the original file.",
        ),
      );
  });
  db.close();
  return { id, name: file.name, type: file.type, size: file.size, sha256 };
}
export async function readUpload(id: string): Promise<Blob | null> {
  if (!id) return null;
  const db = await uploadDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const request = db
      .transaction("files", "readonly")
      .objectStore("files")
      .get(id);
    request.onsuccess = () =>
      resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () =>
      reject(new Error("Could not read this local file."));
  });
  db.close();
  return blob;
}
export async function attachmentBlob(
  meta: Record<string, unknown>,
): Promise<Blob | null> {
  const locator = String(meta.storage_locator || meta.blob_id || "");
  if (locator.startsWith("file_")) return readUpload(locator);
  if (locator.startsWith("/assets/") && !locator.includes("..")) {
    const result = await fetch(locator);
    return result.ok ? result.blob() : null;
  }
  return null;
}
