import { Router, type Request, type Response, type NextFunction } from "express";
import multer, { MulterError } from "multer";
import { parse } from "csv-parse/sync";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
}

type RawRow = Record<string, string>;

function parseCsvBuffer(buffer: Buffer): { headers: string[]; rows: RawRow[] } {
  const content = buffer.toString("utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as RawRow[];

  const headers = records.length > 0 ? Object.keys(records[0]!) : [];
  return { headers, rows: records };
}

const CRM_SYSTEM_PROMPT = `You are an expert CRM data extraction AI for GrowEasy CRM.

Your task is to intelligently map fields from ANY CSV format into the GrowEasy CRM structure.
CSV files may come from Facebook Lead Exports, Google Ads, Excel sheets, Real Estate CRMs, Sales reports, Marketing agency CSVs, or any manually created spreadsheets.

## Output Format — CRITICAL
Return ONLY a JSON object with a single key "records". Example:
{
  "records": [
    {
      "created_at": "2026-05-13T14:20:48",
      "name": "John Doe",
      "email": "john@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "GrowEasy",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "lead_owner": null,
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Client is asking to reschedule demo",
      "data_source": null,
      "possession_time": null,
      "description": null
    },
    {
      "__skipped": true,
      "__reason": "No email or mobile number found",
      "__rowIndex": 3
    }
  ]
}

## CRM Fields to Extract
Map available columns to these fields (set null if not found or inapplicable):
- created_at: Lead creation date — convert to ISO 8601 (YYYY-MM-DDTHH:mm:ss) if possible.
- name: Full lead name. Combine first_name + last_name if separate.
- email: Primary email address only (just one).
- country_code: Country phone code like "+91" or "+1". Extract from phone field if embedded.
- mobile_without_country_code: Mobile digits ONLY — no country code, no symbols, no spaces.
- company: Company or organization name.
- city: City name.
- state: State or province.
- country: Country name.
- lead_owner: Lead owner email or name.
- crm_status: MUST be exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — or null.
- crm_note: Combine remarks, notes, follow-up info, extra phone numbers, extra emails, and any additional useful data.
- data_source: MUST be exactly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — or null (only set if confident match).
- possession_time: Property possession time if found.
- description: Additional description not captured elsewhere.

## Mapping Rules
1. SKIP records with neither a valid email NOR a valid mobile number — mark with __skipped, __reason, __rowIndex.
2. crm_status mapping hints: "interested/follow up/scheduled" → GOOD_LEAD_FOLLOW_UP; "not reachable/busy/no answer" → DID_NOT_CONNECT; "not interested/spam/invalid" → BAD_LEAD; "converted/closed/sold/deal done" → SALE_DONE.
3. Mobile: strip country code and non-digit characters from the number itself; extract country code separately.
4. Multiple emails: first → email field; rest → append to crm_note.
5. Multiple phones: first → mobile field; rest → append to crm_note.
6. Do NOT insert literal newlines in field values — use the literal string \\n if needed so each record stays on one CSV row.
7. Be intelligent about column names: "Phone Number", "Cell", "Contact", "Tel", "Mobile" all map to mobile/country_code.
8. Include __rowIndex in every record (both valid and skipped) corresponding to the input row index.`;

interface CrmRecord {
  __rowIndex?: number;
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: string | null;
  crm_note: string | null;
  data_source: string | null;
  possession_time: string | null;
  description: string | null;
}

interface SkippedRecord {
  rowIndex: number;
  reason: string;
  rawData: RawRow;
}

interface SkippedMarker {
  __skipped: true;
  __reason: string;
  __rowIndex: number;
}

type BatchItem = CrmRecord | SkippedMarker;

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const MAX_OUTPUT_TOKENS = 8192;

function isSkippedMarker(item: BatchItem): item is SkippedMarker {
  return (item as SkippedMarker).__skipped === true;
}

async function processRowBatch(
  genAI: GoogleGenAI,
  rows: RawRow[],
  startIndex: number,
): Promise<{ records: CrmRecord[]; skipped: SkippedRecord[] }> {
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  const rowsWithIndex = rows.map((row, i) => ({ ...row, __rowIndex: startIndex + i }));
  const userContent = JSON.stringify(rowsWithIndex, null, 2);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `${CRM_SYSTEM_PROMPT}\n\nExtract CRM fields from the following ${rows.length} CSV record(s) and return ONLY a valid JSON object with a "records" array. Do not include any explanation, markdown, or extra text.\n\n${userContent}`,
        config: {
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      });

      const content = (response.text ?? "").trim();
      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            parsed = JSON.parse(content.slice(start, end + 1));
          } catch {
            throw new Error(`AI returned invalid JSON: ${content.substring(0, 300)}`);
          }
        } else {
          throw new Error(`AI returned invalid JSON: ${content.substring(0, 300)}`);
        }
      }

      // Deterministically extract the records array from the wrapper object
      if (!parsed || typeof parsed !== "object") {
        throw new Error("AI response is not a JSON object");
      }

      const obj = parsed as Record<string, unknown>;
      let items: BatchItem[];

      if (Array.isArray(obj["records"])) {
        items = obj["records"] as BatchItem[];
      } else {
        // Fallback: find any array in the object
        const anyArray = Object.values(obj).find(Array.isArray);
        if (anyArray) {
          items = anyArray as BatchItem[];
        } else {
          throw new Error(`AI response missing "records" array. Keys found: ${Object.keys(obj).join(", ")}`);
        }
      }

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        if (isSkippedMarker(item)) {
          const rowIdx = item.__rowIndex ?? startIndex;
          const localIdx = rowIdx - startIndex;
          const rawRow = rows[localIdx] ?? rows[0] ?? {};
          skipped.push({
            rowIndex: rowIdx,
            reason: item.__reason ?? "Skipped by AI",
            rawData: rawRow,
          });
        } else {
          const { __rowIndex: _idx, ...rest } = item;
          records.push(rest as CrmRecord);
        }
      }

      return { records, skipped };
    } catch (err) {
      lastError = err;
      // Don't retry on auth errors — they won't fix themselves
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw err;
      }
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn({ attempt, err }, `AI batch attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // All retries exhausted — mark all rows as skipped
  logger.error({ lastError }, "All AI retries exhausted for batch");
  for (let i = 0; i < rows.length; i++) {
    skipped.push({
      rowIndex: startIndex + i,
      reason: "AI processing failed after all retries",
      rawData: rows[i]!,
    });
  }
  return { records, skipped };
}

// POST /api/csv/upload — parse and preview CSV (no AI)
router.post(
  "/csv/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Send a CSV file in the 'file' field." });
      return;
    }

    try {
      const { headers, rows } = parseCsvBuffer(req.file.buffer);

      if (rows.length === 0) {
        res.status(400).json({ error: "CSV file is empty or has no valid data rows." });
        return;
      }

      res.json({
        headers,
        rows: rows.slice(0, 100), // preview up to 100 rows
        totalRows: rows.length,
        fileName: req.file.originalname,
      });
    } catch (err) {
      req.log.error({ err }, "CSV parse failed");
      res.status(400).json({ error: "Failed to parse CSV. Ensure it is a valid CSV file." });
    }
  },
);

// POST /api/csv/import — AI-powered CRM extraction
router.post(
  "/csv/import",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Send a CSV file in the 'file' field." });
      return;
    }

    let genAI: GoogleGenAI;
    try {
      genAI = getGeminiClient();
    } catch {
      res.status(500).json({ error: "Gemini API key not configured. Set the GEMINI_API_KEY environment variable." });
      return;
    }

    try {
      const { rows } = parseCsvBuffer(req.file.buffer);

      if (rows.length === 0) {
        res.status(400).json({ error: "CSV file is empty or has no valid data rows." });
        return;
      }

      const allRecords: CrmRecord[] = [];
      const allSkipped: SkippedRecord[] = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { records, skipped } = await processRowBatch(genAI, batch, i);
        allRecords.push(...records);
        allSkipped.push(...skipped);
        req.log.info(
          { batchStart: i, batchSize: batch.length, extracted: records.length, skipped: skipped.length },
          "Batch processed",
        );
      }

      res.json({
        records: allRecords,
        skipped: allSkipped,
        totalImported: allRecords.length,
        totalSkipped: allSkipped.length,
        totalProcessed: rows.length,
      });
    } catch (err) {
      req.log.error({ err }, "CSV import failed");
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        res.status(401).json({
          error: "Invalid Gemini API key. Please update your GEMINI_API_KEY secret with a valid key.",
        });
        return;
      }
      res.status(500).json({
        error: "AI processing failed. Please try again.",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

// Centralized error handler for multer errors on this router
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File too large. Maximum size is 50MB." });
      return;
    }
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }
  if (err.message === "Only CSV files are allowed") {
    res.status(400).json({ error: "Invalid file type. Only CSV files are accepted." });
    return;
  }
  next(err);
});

export default router;
