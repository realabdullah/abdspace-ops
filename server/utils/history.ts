import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ActivityEvent, AvailabilitySummary, HealthState, HistoryPayload, HistoryPoint, ServerStats } from "#shared/types/dashboard";
import type { DashboardConfig } from "./dashboard-config";

const DAY_MS = 86_400_000;
const RETENTION_MS = 32 * DAY_MS;
const COLLECTION_INTERVAL_MS = 60_000;

interface MetricRow {
	at: number;
	value: number;
}

interface AvailabilityRow {
	name: string;
	availablePercent: number;
	samples: number;
}

interface EventRow {
	id: string;
	at: number;
	kind: ActivityEvent["kind"];
	title: string;
	detail: string | null;
	state: HealthState;
}

let database: DatabaseSync | null = null;
let databasePath: string | null = null;
let opening: Promise<DatabaseSync> | null = null;
let lastCollectionAt = 0;
let lastCleanupAt = 0;

const emptyHistory = (error: string | null): HistoryPayload => ({
	available: false,
	error,
	cpu: [],
	memory: [],
	disk: [],
	availability: [],
	deployments: [],
	backups: [],
});

async function openDatabase(path: string): Promise<DatabaseSync> {
	if (database && databasePath === path) return database;
	if (opening) return opening;
	opening = (async () => {
		await mkdir(dirname(path), { recursive: true });
		const next = new DatabaseSync(path);
		next.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA busy_timeout = 3000;
		CREATE TABLE IF NOT EXISTS metrics (
			at INTEGER PRIMARY KEY,
			cpu REAL,
			memory REAL,
			disk REAL
		);
		CREATE TABLE IF NOT EXISTS availability (
			at INTEGER NOT NULL,
			name TEXT NOT NULL,
			state TEXT NOT NULL,
			PRIMARY KEY (at, name)
		);
		CREATE INDEX IF NOT EXISTS availability_name_at ON availability (name, at);
		CREATE TABLE IF NOT EXISTS events (
			id TEXT PRIMARY KEY,
			at INTEGER NOT NULL,
			kind TEXT NOT NULL,
			title TEXT NOT NULL,
			detail TEXT,
			state TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS events_kind_at ON events (kind, at);
		`);
		database?.close();
		database = next;
		databasePath = path;
		return next;
	})();
	try {
		return await opening;
	} finally {
		opening = null;
	}
}

function recordSnapshot(db: DatabaseSync, at: number, server: ServerStats | null, availability: Array<{ name: string; state: HealthState }>, activity: ActivityEvent[]): void {
	const minute = Math.floor(at / COLLECTION_INTERVAL_MS) * COLLECTION_INTERVAL_MS;
	db.exec("BEGIN IMMEDIATE");
	try {
		if (server) {
			db.prepare("INSERT OR REPLACE INTO metrics (at, cpu, memory, disk) VALUES (?, ?, ?, ?)").run(minute, server.cpu.usagePercent, server.memory.usagePercent, server.disk.usagePercent);
		}
		const insertAvailability = db.prepare("INSERT OR REPLACE INTO availability (at, name, state) VALUES (?, ?, ?)");
		for (const item of availability) insertAvailability.run(minute, item.name, item.state);
		const insertEvent = db.prepare("INSERT OR IGNORE INTO events (id, at, kind, title, detail, state) VALUES (?, ?, ?, ?, ?, ?)");
		for (const event of activity) {
			const eventAt = Date.parse(event.at);
			if (Number.isFinite(eventAt) && eventAt >= at - RETENTION_MS && eventAt <= at + DAY_MS) {
				insertEvent.run(event.id, eventAt, event.kind, event.title, event.detail, event.state);
			}
		}
		if (at - lastCleanupAt >= DAY_MS) {
			const cutoff = at - RETENTION_MS;
			db.prepare("DELETE FROM metrics WHERE at < ?").run(cutoff);
			db.prepare("DELETE FROM availability WHERE at < ?").run(cutoff);
			db.prepare("DELETE FROM events WHERE at < ?").run(cutoff);
			lastCleanupAt = at;
		}
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}

export async function collectHistory(config: DashboardConfig): Promise<void> {
	if (!config.historyPath) return;
	const at = Date.now();
	if (at - lastCollectionAt < COLLECTION_INTERVAL_MS) return;
	lastCollectionAt = at;
	const [server, docker, kuma, backupActivity] = await Promise.all([
		readServerStats(config.diskPath).catch(() => null),
		readDockerSnapshot(config.docker).catch(() => null),
		readKumaSnapshot(config.kuma.baseUrl, config.kuma.statusSlug).catch(() => null),
		readBackupActivity(config.backup).catch(() => []),
	]);
	const availability = [
		...(docker?.services.map((service) => ({ name: `Swarm · ${service.name}`, state: service.state })) ?? []),
		...(kuma?.checks.map((check) => ({ name: `External · ${check.name}`, state: check.state })) ?? []),
	];
	const activity = [...(docker?.activity ?? []), ...(kuma?.activity ?? []), ...backupActivity];
	recordSnapshot(await openDatabase(config.historyPath), at, server, availability, activity);
}

function metricSeries(db: DatabaseSync, column: "cpu" | "memory" | "disk", since: number, bucketMs: number): HistoryPoint[] {
	const rows = db.prepare(`SELECT MAX(at) AS at, AVG(${column}) AS value FROM metrics WHERE at >= ? GROUP BY CAST(at / ? AS INTEGER) ORDER BY at`).all(since, bucketMs) as unknown as MetricRow[];
	return rows.map((row) => ({ at: new Date(row.at).toISOString(), value: Math.round(row.value * 10) / 10 }));
}

function recentEvents(db: DatabaseSync, kind: "deployment" | "backup", since: number): ActivityEvent[] {
	const rows = db.prepare("SELECT id, at, kind, title, detail, state FROM events WHERE kind = ? AND at >= ? ORDER BY at DESC LIMIT 30").all(kind, since) as unknown as EventRow[];
	return rows.map((row) => ({ ...row, at: new Date(row.at).toISOString() }));
}

export async function readHistory(path: string): Promise<HistoryPayload> {
	if (!path) return emptyHistory("History storage is not configured");
	try {
		const db = await openDatabase(path);
		const now = Date.now();
		const availability = db
			.prepare(
				"SELECT name, ROUND(100.0 * SUM(CASE WHEN state = 'online' THEN 1 ELSE 0 END) / COUNT(*), 1) AS availablePercent, COUNT(*) AS samples FROM availability WHERE at >= ? GROUP BY name ORDER BY name"
			)
			.all(now - DAY_MS) as unknown as AvailabilityRow[];
		return {
			available: true,
			error: null,
			cpu: metricSeries(db, "cpu", now - 6 * 3_600_000, 5 * 60_000),
			memory: metricSeries(db, "memory", now - DAY_MS, 15 * 60_000),
			disk: metricSeries(db, "disk", now - 30 * DAY_MS, 6 * 3_600_000),
			availability: availability as AvailabilitySummary[],
			deployments: recentEvents(db, "deployment", now - 30 * DAY_MS),
			backups: recentEvents(db, "backup", now - 30 * DAY_MS),
		};
	} catch (error) {
		console.error("[history] read failed", error);
		return emptyHistory("History storage is unavailable");
	}
}
