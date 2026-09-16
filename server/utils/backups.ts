import { open, stat } from "node:fs/promises";
import type { BackupStatus } from "#shared/types/dashboard";
import type { DashboardConfig } from "./dashboard-config";

const TAIL_BYTES = 64 * 1024;

async function tail(path: string): Promise<string> {
	const handle = await open(path, "r");
	try {
		const { size } = await handle.stat();
		const length = Math.min(size, TAIL_BYTES);
		const buffer = Buffer.alloc(length);
		await handle.read(buffer, 0, length, size - length);
		return buffer.toString("utf8");
	} finally {
		await handle.close();
	}
}

function timestampIn(line: string): Date | null {
	const iso = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
	if (iso) {
		const parsed = new Date(iso[0].replace(" ", "T"));
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	const dashed = line.match(/(\d{4})-(\d{2})-(\d{2})[_T ](\d{2})[-:](\d{2})[-:](\d{2})/);
	if (dashed) {
		const parsed = localDate(dashed);
		if (parsed) return parsed;
	}

	const compact = line.match(/(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/);
	if (compact) {
		const parsed = localDate(compact);
		if (parsed) return parsed;
	}

	return null;
}

function localDate(match: RegExpMatchArray): Date | null {
	const [, y, mo, d, h, mi, s] = match.map(Number);
	const parsed = new Date(y!, mo! - 1, d!, h!, mi!, s!);
	return Number.isNaN(parsed.getTime()) || parsed.getMonth() !== mo! - 1 ? null : parsed;
}

async function latestFromLog(path: string, successPattern: string): Promise<Date | null> {
	const success = new RegExp(successPattern, "i");
	const lines = (await tail(path)).split("\n");

	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index]!;
		if (!success.test(line)) continue;
		const at = timestampIn(line);
		if (at) return at;
	}
	return null;
}

export async function readBackupStatus(config: DashboardConfig["backup"]): Promise<BackupStatus> {
	if (!config.logPath && !config.markerPath) {
		return { latestAt: null, ageSeconds: null, state: "unknown", detail: "no backup log configured" };
	}

	let latest: Date | null = null;

	if (config.logPath) {
		latest = await latestFromLog(config.logPath, config.successPattern);
	}
	if (!latest && config.markerPath) {
		latest = (await stat(config.markerPath)).mtime;
	}

	if (!latest) {
		return { latestAt: null, ageSeconds: null, state: "offline", detail: "no successful backup found in log" };
	}

	const ageSeconds = Math.max(0, Math.floor((Date.now() - latest.getTime()) / 1000));
	const maxAgeSeconds = config.maxAgeHours * 3600;
	const state = ageSeconds <= maxAgeSeconds ? "online" : ageSeconds <= maxAgeSeconds * 2 ? "degraded" : "offline";
	const detail = state === "online" ? "within schedule" : `older than ${config.maxAgeHours}h`;

	return { latestAt: latest.toISOString(), ageSeconds, state, detail };
}
