import assert from "node:assert/strict";
import test from "node:test";
import { parseBackupLog } from "./backups.ts";

test("parses the current backup filename and timestamp format", () => {
	const result = parseBackupLog("Backup completed: taskgid-2026-09-16_16-54-31.dump", "completed|success");

	assert.equal(result.latestSuccess?.filename, "taskgid-2026-09-16_16-54-31.dump");
	assert.equal(result.latestSuccess?.at?.toISOString(), "2026-09-16T16:54:31.000Z");
	assert.equal(result.latestSuccess?.sizeBytes, null);
});

test("keeps the latest success and latest failure independently", () => {
	const result = parseBackupLog(["Backup completed: taskgid-2026-09-15_16-54-31.dump size=24 MB", "Backup failed: taskgid-2026-09-16_16-54-31.dump upload error"].join("\n"), "completed|success");

	assert.equal(result.latestSuccess?.sizeBytes, 24 * 1024 * 1024);
	assert.equal(result.lastFailure?.filename, "taskgid-2026-09-16_16-54-31.dump");
});

test("returns no success for an empty or unrelated log", () => {
	assert.equal(parseBackupLog("cron started", "completed|success").latestSuccess, null);
});
