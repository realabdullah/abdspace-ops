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

export function timestampIn(line: string): Date | null {
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

interface BackupLogEntry {
	at: Date | null;
	filename: string | null;
	sizeBytes: number | null;
	detail: string;
}

interface ParsedBackupLog {
	latestSuccess: BackupLogEntry | null;
	lastFailure: BackupLogEntry | null;
}

export function parseBackupLog(content: string, successPattern: string): ParsedBackupLog {
	const success = new RegExp(successPattern, "i");
	const failure = /failed|failure|error/i;
	const lines = content.split("\n");
	let latestSuccess: BackupLogEntry | null = null;
	let lastFailure: BackupLogEntry | null = null;

	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const line = lines[index]!;
		if (!latestSuccess && success.test(line)) latestSuccess = entryFrom(line);
		if (!lastFailure && failure.test(line)) lastFailure = entryFrom(line);
		if (latestSuccess && lastFailure) break;
	}
	return { latestSuccess, lastFailure };
}

function entryFrom(line: string): BackupLogEntry {
	return {
		at: timestampIn(line),
		filename: line.match(/\btaskgid-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.dump\b/i)?.[0] ?? null,
		sizeBytes: sizeIn(line),
		detail: line.trim().slice(0, 240),
	};
}

function sizeIn(line: string): number | null {
	const match = line.match(/(?:size[=:]?\s*|\()(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|KiB|MiB|GiB)\b/i);
	if (!match) return null;
	const powers: Record<string, number> = { b: 0, kb: 1, kib: 1, mb: 2, mib: 2, gb: 3, gib: 3 };
	return Math.round(Number(match[1]) * 1024 ** powers[match[2]!.toLowerCase()]!);
}

export async function readBackupStatus(config: DashboardConfig["backup"]): Promise<BackupStatus> {
	if (!config.logPath && !config.markerPath) {
		return { latestAt: null, ageSeconds: null, filename: null, sizeBytes: null, retentionDays: config.retentionDays, lastFailure: null, state: "unknown", detail: "no backup log configured" };
	}

	let latest: Date | null = null;
	let filename: string | null = null;
	let sizeBytes: number | null = null;
	let lastFailure: BackupStatus["lastFailure"] = null;

	if (config.logPath) {
		const parsed = parseBackupLog(await tail(config.logPath), config.successPattern);
		latest = parsed.latestSuccess?.at ?? null;
		filename = parsed.latestSuccess?.filename ?? null;
		sizeBytes = parsed.latestSuccess?.sizeBytes ?? null;
		if (parsed.lastFailure) {
			lastFailure = {
				at: parsed.lastFailure.at?.toISOString() ?? null,
				detail: parsed.lastFailure.detail,
				filename: parsed.lastFailure.filename,
			};
		}
	}
	if (!latest && config.markerPath) {
		latest = (await stat(config.markerPath)).mtime;
	}

	if (!latest) {
		return { latestAt: null, ageSeconds: null, filename, sizeBytes, retentionDays: config.retentionDays, lastFailure, state: "offline", detail: "no successful backup found in log" };
	}

	const ageSeconds = Math.max(0, Math.floor((Date.now() - latest.getTime()) / 1000));
	const maxAgeSeconds = config.maxAgeHours * 3600;
	const state = ageSeconds <= maxAgeSeconds ? "online" : ageSeconds <= maxAgeSeconds * 2 ? "degraded" : "offline";
	const detail = state === "online" ? "within schedule" : `older than ${config.maxAgeHours}h`;

	return { latestAt: latest.toISOString(), ageSeconds, filename, sizeBytes, retentionDays: config.retentionDays, lastFailure, state, detail };
}
