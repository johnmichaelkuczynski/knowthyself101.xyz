import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./lib/seed";
import { ensureSettings } from "./lib/settings";
import { ensureUsersAndBackfill } from "./lib/users";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedIfEmpty().catch((err) => {
  logger.error({ err }, "Seed failed");
});

ensureSettings().catch((err) => {
  logger.error({ err }, "Settings init failed");
});

// Create the two well-known users (primary + synthetic) and assign any pre-existing
// rows to the primary user. This is what keeps the synthetic diagnostic's data from
// ever touching the real user's work.
ensureUsersAndBackfill().catch((err) => {
  logger.error({ err }, "User init/backfill failed");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
