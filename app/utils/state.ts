import type { HealthState } from "#shared/types/dashboard";

export type Tone = "ok" | "warn" | "crit" | "idle";

export const TONE: Record<HealthState, Tone> = {
	online: "ok",
	degraded: "warn",
	offline: "crit",
	unknown: "idle",
};

export const STATE_LABEL: Record<HealthState, string> = {
	online: "Online",
	degraded: "Degraded",
	offline: "Offline",
	unknown: "Unknown",
};

export const TONE_TEXT: Record<Tone, string> = {
	ok: "text-ok",
	warn: "text-warn",
	crit: "text-crit",
	idle: "text-idle",
};

export const TONE_FILL: Record<Tone, string> = {
	ok: "bg-ok",
	warn: "bg-warn",
	crit: "bg-crit",
	idle: "bg-idle",
};

export const STATE_ORDER: Record<HealthState, number> = {
	offline: 0,
	degraded: 1,
	unknown: 2,
	online: 3,
};

export function byState<T extends { state: HealthState; name: string }>(items: T[]): T[] {
	return [...items].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.name.localeCompare(b.name));
}

export function usageTone(value: number, warning: number, critical: number): Tone {
	if (value >= critical) return "crit";
	if (value >= warning) return "warn";
	return "ok";
}

const HINTS: Array<[RegExp, string]> = [
	[/socket proxy/i, "Check that the docker-socket-proxy container is running and on the ops network."],
	[/configured path does not exist/i, "Check DASHBOARD_DISK_PATH and the bind mount for the disk probe."],
	[/permission denied/i, "The container user cannot read this path. Check the bind mount permissions."],
	[/timed out/i, "The source answered too slowly. It may be under load."],
	[/is not set/i, "Set this variable in the deployment environment."],
];

export function hintFor(error: string): string | null {
	return HINTS.find(([pattern]) => pattern.test(error))?.[1] ?? null;
}
