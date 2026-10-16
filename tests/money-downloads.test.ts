import assert from "node:assert/strict";
import { test } from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import {
  csvBytes,
  displayAmount,
  hashBytes,
  makePdf,
  parseAmount,
  safeFilename,
  validateUpload,
  zipBytes,
} from "../src/lib/downloads";

test("money input preserves exact USD cents and IDR rupiah without exponent/negative/precision coercion", () => {
  assert.equal(parseAmount("270.00", "USD"), 27000);
  assert.equal(parseAmount("0.01", "USD"), 1);
  assert.equal(parseAmount("12.3", "USD"), 1230);
  assert.equal(parseAmount("3969000", "IDR"), 3969000);
  assert.equal(parseAmount("0001.20", "USD"), 120);
  for (const invalid of [
    "1e3",
    "-5",
    "NaN",
    "Infinity",
    "$5",
    "1,000",
    "0.001",
    "",
    ".5",
  ])
    assert.equal(parseAmount(invalid, "USD"), null);
  assert.equal(parseAmount("100.00", "IDR"), null);
  assert.equal(parseAmount("5", "EUR"), null);
  assert.equal(parseAmount("99999999999999999999999", "USD"), null);
  assert.equal(displayAmount(27000, "USD"), "270.00");
  assert.equal(displayAmount(3969000, "IDR"), "3969000");
});

test("CSV escapes formulas, embedded separators, quotation marks, linebreaks and retains UTF-8 amounts", () => {
  const csv = new TextDecoder().decode(
    csvBytes(
      ["description", "amount_minor", "currency"],
      [
        ['Research, "phase 2"\nJakarta café', 27000, "USD"],
        ['=HYPERLINK("https://example.test")', 375000, "IDR"],
        ["  +SUM(A1:A2)", 1200, "USD"],
        ["@malicious", 2, "USD"],
      ],
    ),
  );
  assert.ok(
    csv.includes('"Research, ""phase 2""\nJakarta café","27000","USD"'),
  );
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.test"")"'));
  assert.ok(csv.includes('"\'  +SUM(A1:A2)"'));
  assert.ok(csv.includes('"\'@malicious"'));
  assert.ok(csv.endsWith("\r\n"));
  assert.ok(
    new TextDecoder().decode(csvBytes(["a", "b"], [])).includes('"a","b"\r\n'),
  );
});

test("invoice PDF creates genuine paginated document bytes from an explicit safe projection", async () => {
  const blob = makePdf("Invoice SAMPLE-2026-001", [
    ["Bill to", "Northstar"],
    ["Invoice total", "$270.00"],
    ["Due", "16 October 2026"],
    ...Array.from({ length: 80 }, (_, i): [string, string] => [
      `Item ${i + 1}`,
      "Agreed professional work",
    ]),
  ]);
  assert.equal(blob.type, "application/pdf");
  const text = new TextDecoder().decode(await blob.arrayBuffer());
  assert.ok(text.startsWith("%PDF-"));
  assert.ok(text.includes("/Type /Catalog"));
  assert.ok(text.includes("xref"));
  assert.ok(text.includes("%%EOF"));
  assert.ok(text.includes("Northstar"));
  assert.ok(text.includes("$270.00"));
  assert.ok((text.match(/\/Type \/Page\b/g) || []).length > 1);
  assert.ok(!text.includes("private_note_ids"));
});

test("receipt ZIP opens with exact original bytes, safe paths and a matching hash manifest", async () => {
  const receipt = new TextEncoder().encode(
    "Receipt\nActual original café evidence\nUSD 12.00",
  );
  const hash = await hashBytes(receipt.buffer);
  const manifest = JSON.stringify({
    title: "Partial receipt archive",
    records: [
      { expense_id: "expense_1", sha256: hash, status: "included" },
      {
        expense_id: "expense_2",
        status: "missing",
        reason: "No receipt attached",
      },
    ],
  });
  const zipped = zipBytes({
    "expense_1_receipt.txt": receipt,
    "manifest.json": manifest,
    "../../unsafe.txt": "safe path",
  });
  const entries = unzipSync(zipped);
  assert.deepEqual(entries["expense_1_receipt.txt"], receipt);
  assert.equal(strFromU8(entries["manifest.json"]), manifest);
  assert.ok(
    Object.keys(entries).every(
      (name) => !name.includes("/") && !name.includes("\\"),
    ),
  );
  assert.equal(
    JSON.parse(strFromU8(entries["manifest.json"])).records[0].sha256,
    await hashBytes(entries["expense_1_receipt.txt"].buffer as ArrayBuffer),
  );
  assert.equal(
    JSON.parse(strFromU8(entries["manifest.json"])).records[1].status,
    "missing",
  );
});

test("upload validator accepts actual allowed signatures and rejects filename/MIME/content mismatches", async () => {
  assert.equal(
    await validateUpload(
      new File(["Plain receipt"], "receipt.txt", { type: "text/plain" }),
    ),
    null,
  );
  assert.equal(
    await validateUpload(
      new File(["%PDF-1.7\n%%EOF"], "receipt.pdf", { type: "application/pdf" }),
    ),
    null,
  );
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  assert.equal(
    await validateUpload(new File([png], "receipt.png", { type: "image/png" })),
    null,
  );
  assert.equal(
    await validateUpload(
      new File([Uint8Array.from([255, 216, 255, 0])], "receipt.jpg", {
        type: "image/jpeg",
      }),
    ),
    null,
  );
  assert.match(
    (await validateUpload(
      new File(["not PDF"], "receipt.pdf", { type: "application/pdf" }),
    ))!,
    /contents/,
  );
  assert.match(
    (await validateUpload(
      new File(["plain"], "receipt.png", { type: "text/plain" }),
    ))!,
    /matching file type/,
  );
  for (const [name, mime, contents] of [
    ["bad.svg", "image/svg+xml", "<svg/>"],
    ["bad.html", "text/html", "<html/>"],
    ["bad.zip", "application/zip", "PK"],
    ["bad.txt", "text/plain", "<script>alert(1)</script>"],
  ])
    assert.ok(await validateUpload(new File([contents], name, { type: mime })));
  assert.match(
    (await validateUpload(new File([], "empty.txt", { type: "text/plain" })))!,
    /empty/,
  );
});

test("upload size boundary accepts exactly 10 MiB, rejects the next byte, and preserves the filename in errors", async () => {
  const prefix = new TextEncoder().encode("%PDF-1.7\n");
  const max = 10_485_760;
  const boundary = new File(
    [prefix, new Uint8Array(max - prefix.length)],
    "maximum.pdf",
    { type: "application/pdf" },
  );
  assert.equal(await validateUpload(boundary), null);
  const tooLarge = new File(
    [prefix, new Uint8Array(max - prefix.length + 1)],
    "over-limit.pdf",
    { type: "application/pdf" },
  );
  assert.match((await validateUpload(tooLarge))!, /over-limit\.pdf: exceeds/);
  assert.equal(
    safeFilename("../../receipt:report.pdf"),
    "-..-receipt-report.pdf",
  );
});
