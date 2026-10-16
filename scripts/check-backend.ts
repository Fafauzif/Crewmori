import { integrationStatus, runtimeConfig } from "../src/server/config";

const config = runtimeConfig();
process.stdout.write(`Backend: ${config.enabled ? "enabled" : "disabled"}\nPayment mode: ${config.PAYMENT_PROVIDER}\n`);
for (const [name, value] of Object.entries(integrationStatus())) {
  process.stdout.write(`${name}: ${value.configured ? "configured (not connection-tested)" : `missing ${value.missing.join(", ")}`}\n`);
}
