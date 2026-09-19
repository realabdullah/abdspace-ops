import type { Shortcut } from "#shared/types/dashboard";

export interface NamedTarget {
	label: string;
	match: string;
}

export function parsePairs(raw: string | undefined): NamedTarget[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const index = entry.indexOf("=");
			if (index === -1) return { label: entry, match: entry };
			return { label: entry.slice(0, index).trim(), match: entry.slice(index + 1).trim() };
		})
		.filter((target) => target.label && target.match);
}

export function parseLinks(raw: string | undefined): Shortcut[] {
	return parsePairs(raw)
		.map((target) => ({ label: target.label, url: target.match }))
		.filter((link) => /^https?:\/\//i.test(link.url));
}

function accessIssuer(raw: string | undefined): string {
	const value = (raw || "").trim().replace(/\/+$/, "");
	if (!value) return "";
	return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/\.cloudflareaccess\.com$/i, "")}.cloudflareaccess.com`;
}

export function dashboardConfig() {
	const env = process.env;
	const cpuWarningPercent = percent(env.CPU_WARNING_PERCENT, 75);
	const ramWarningPercent = percent(env.RAM_WARNING_PERCENT, 80);
	const diskWarningPercent = percent(env.DISK_WARNING_PERCENT, 75);
	return {
		historyPath: env.DASHBOARD_HISTORY_PATH || "",
		diskPath: env.DASHBOARD_DISK_PATH || "/",
		docker: {
			apiUrl: (env.DOCKER_API_URL || "").replace(/\/+$/, ""),
			mode: env.DASHBOARD_DOCKER_MODE === "swarm" ? ("swarm" as const) : ("containers" as const),
			services: parsePairs(env.DASHBOARD_SERVICES),
			deployments: parsePairs(env.DASHBOARD_DEPLOYMENTS),
		},
		kuma: {
			baseUrl: (env.UPTIME_KUMA_URL || "").replace(/\/+$/, ""),
			statusSlug: env.UPTIME_KUMA_STATUS_SLUG || "",
		},
		backup: {
			logPath: env.BACKUP_LOG_PATH || "",
			markerPath: env.BACKUP_MARKER_PATH || "",
			successPattern: env.BACKUP_LOG_SUCCESS_PATTERN || "completed|success",
			maxAgeHours: positiveNumber(env.BACKUP_WARNING_HOURS || env.BACKUP_MAX_AGE_HOURS, 26),
			retentionDays: positiveNumber(env.BACKUP_RETENTION_DAYS, 14),
		},
		thresholds: {
			cpuWarningPercent,
			cpuCriticalPercent: Math.max(cpuWarningPercent, percent(env.CPU_CRITICAL_PERCENT, 90)),
			ramWarningPercent,
			ramCriticalPercent: Math.max(ramWarningPercent, percent(env.RAM_CRITICAL_PERCENT, 90)),
			diskWarningPercent,
			diskCriticalPercent: Math.max(diskWarningPercent, percent(env.DISK_CRITICAL_PERCENT, 90)),
		},
		shortcuts: parseLinks(env.DASHBOARD_LINKS),
		serviceLinks: parseLinks(env.DASHBOARD_SERVICE_LINKS),
		sensitiveDiagnosticsEnabled: env.DASHBOARD_ENABLE_SENSITIVE_DIAGNOSTICS === "true" && Boolean(accessIssuer(env.CF_ACCESS_TEAM_DOMAIN) && env.CF_ACCESS_AUD),
		cfAccess: {
			issuer: accessIssuer(env.CF_ACCESS_TEAM_DOMAIN),
			audience: env.CF_ACCESS_AUD || "",
		},
		requireCfAccess: env.DASHBOARD_REQUIRE_CF_ACCESS === "true",
	};
}

function positiveNumber(raw: string | undefined, fallback: number): number {
	const value = Number(raw);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percent(raw: string | undefined, fallback: number): number {
	return Math.min(100, positiveNumber(raw, fallback));
}

export type DashboardConfig = ReturnType<typeof dashboardConfig>;
