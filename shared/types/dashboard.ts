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
	name: string;
	state: HealthState;
	detail: string;
	source: "docker" | "uptime-kuma";
	replicas: { running: number; desired: number } | null;
}

export interface Deployment {
	name: string;
	image: string | null;
	imageId: string | null;
	createdAt: string | null;
}

export interface BackupStatus {
	latestAt: string | null;
	ageSeconds: number | null;
	state: HealthState;
	detail: string;
}

export interface Shortcut {
	label: string;
	url: string;
}

export interface DashboardPayload {
	generatedAt: string;
	server: Section<ServerStats>;
	services: Section<ServiceStatus[]>;
	deployments: Section<Deployment[]>;
	backup: Section<BackupStatus>;
	shortcuts: Shortcut[];
}
