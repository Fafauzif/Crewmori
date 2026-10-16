import { privateStorage } from "../src/server/files";

async function setup() {
  const { client, name } = privateStorage();
  const existing = await client.storage.getBucket(name);
  if (existing.data) {
    if (existing.data.public) throw Error("Existing bucket is public. Use a separate private bucket.");
    process.stdout.write("Private storage bucket already exists.\n");
    return;
  }
  const result = await client.storage.createBucket(name, { public: false, fileSizeLimit: 10485760, allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "text/plain"] });
  if (result.error) throw Error("Storage bucket creation failed.");
  process.stdout.write("Private storage bucket created.\n");
}
setup().catch(() => { process.stderr.write("Storage setup failed. Check project access and bucket privacy.\n"); process.exitCode = 1; });
