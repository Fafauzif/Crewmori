import { GoogleGenAI } from "@google/genai";
import { requireConfiguration, runtimeConfig } from "../config";
import { assertService, ServiceError } from "../errors";

export async function embedText(text: string) {
  assertService(text.trim().length > 0 && text.length <= 20000, "INVALID_SOURCE", "Use a nonempty source of at most 20,000 characters.", 422);
  const { GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL } = requireConfiguration(["GEMINI_API_KEY", "GEMINI_EMBEDDING_MODEL"]);
  const dimensions = runtimeConfig().GEMINI_EMBEDDING_DIMENSIONS;
  let result;
  try {
    result = await new GoogleGenAI({ apiKey: GEMINI_API_KEY, httpOptions: { timeout: 30000 } }).models.embedContent({ model: GEMINI_EMBEDDING_MODEL, contents: text, config: { outputDimensionality: dimensions } });
  } catch { throw new ServiceError("EMBEDDING_UNAVAILABLE", "The source could not be embedded.", 502); }
  const values = result.embeddings?.[0]?.values;
  assertService(values?.length === dimensions && values.every(Number.isFinite), "INVALID_EMBEDDING", "The embedding has an incompatible dimension.", 502);
  return { values, model: GEMINI_EMBEDDING_MODEL, dimensions };
}
