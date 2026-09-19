export type HealthState = "online" | "degraded" | "offline" | "unknown";

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface CpuStats {
	usagePercent: number;
	cores: number;
	load: [number, number, number];
}

export interface MemoryStats {
	usedBytes: number;
	totalBytes: number;
	usagePercent: number;
}

export interface DiskStats {
	usedBytes: number;
	totalBytes: number;
	usagePercent: number;
}

export interface ServerStats {
	hostname: string;
	uptimeSeconds: number;
	cpu: CpuStats;
	memory: MemoryStats;
	disk: DiskStats;
}

export interface ServiceStatus {
	id: string | null;
	name: string;
	state: HealthState;
	detail: string;
	source: "docker";
	replicas: { running: number; desired: number } | null;
	image: string | null;
	taskState: string | null;
	taskId: string | null;
	taskStatusAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	failureReason: string | null;
}

export interface ExternalCheck {
	id: string;
	name: string;
	state: HealthState;
	detail: string;
	source: "uptime-kuma" | "dashboard";
	checkedAt: string | null;
}

export interface Deployment {
	name: string;
	image: string | null;
	digest: string | null;
	immutableTag: string | null;
	deployedAt: string | null;
	commitSha: string | null;
}

export interface BackupStatus {
	latestAt: string | null;
	ageSeconds: number | null;
	filename: string | null;
	sizeBytes: number | null;
	retentionDays: number;
	maxAgeHours: number;
	lastFailure: { at: string | null; detail: string; filename: string | null } | null;
	state: HealthState;
	detail: string;
}

export interface Shortcut {
	label: string;
	url: string;
}

export type ActivityKind = "service" | "deployment" | "backup" | "external";

export interface ActivityEvent {
	id: string;
	at: string;
	kind: ActivityKind;
	title: string;
	detail: string | null;
	state: HealthState;
}

export interface AttentionItem {
	id: string;
	severity: "warning" | "critical";
	title: string;
	detail: string;
}

export interface Thresholds {
	cpuWarningPercent: number;
	cpuCriticalPercent: number;
	ramWarningPercent: number;
	ramCriticalPercent: number;
	diskWarningPercent: number;
	diskCriticalPercent: number;
}

export interface DashboardPayload {
	generatedAt: string;
	server: Section<ServerStats>;
	swarmServices: Section<ServiceStatus[]>;
	externalHealth: Section<ExternalCheck[]>;
	deployments: Section<Deployment[]>;
	backup: Section<BackupStatus>;
	activity: ActivityEvent[];
	attention: AttentionItem[];
	shortcuts: Shortcut[];
	thresholds: Thresholds;
}

export interface HistoryPoint {
	at: string;
	value: number;
}

export interface AvailabilitySummary {
	name: string;
	availablePercent: number;
	samples: number;
}

export interface HistoryPayload {
	available: boolean;
	error: string | null;
	cpu: HistoryPoint[];
	memory: HistoryPoint[];
	disk: HistoryPoint[];
	availability: AvailabilitySummary[];
	deployments: ActivityEvent[];
	backups: ActivityEvent[];
}
