import type { ActivityEvent, AttentionItem, DashboardPayload, ExternalCheck, Section } from "#shared/types/dashboard";

export default defineEventHandler(async (event): Promise<DashboardPayload> => {
	const config = dashboardConfig();

	const docker = readDockerSnapshot(config.docker);
	docker.catch(() => {});
	const kuma = config.kuma.baseUrl && config.kuma.statusSlug ? readKumaSnapshot(config.kuma.baseUrl, config.kuma.statusSlug) : Promise.resolve({ checks: [], activity: [] });
	kuma.catch(() => {});

	const [server, swarmServices, externalHealth, deployments, backup] = await Promise.all([
		section(() => readServerStats(config.diskPath)),
		section(async () => (await docker).services),
		section(async (): Promise<ExternalCheck[]> => {
			const self = dashboardSelfCheck();
			if (!config.kuma.baseUrl || !config.kuma.statusSlug) return [self];
			try {
				return [self, ...(await kuma).checks];
			} catch (error) {
				console.error("[dashboard] Uptime Kuma check failed", error);
				return [self, { id: "kuma-unavailable", name: "Uptime Kuma", state: "unknown", detail: "status page unavailable", source: "uptime-kuma", checkedAt: null }];
			}
		}),
		section(async () => (await docker).deployments),
		section(() => readBackupStatus(config.backup)),
	]);
	const [dockerActivity, kumaActivity, backupActivity] = await Promise.all([
		docker.then((snapshot) => snapshot.activity).catch(() => []),
		kuma.then((snapshot) => snapshot.activity).catch(() => []),
		readBackupActivity(config.backup).catch(() => []),
	]);
	const activity = recentActivity(dockerActivity, kumaActivity, backupActivity);
	const attention = buildAttention({ server, swarmServices, externalHealth, backup }, config.thresholds);

	setResponseHeader(event, "cache-control", "no-store");

	return {
		generatedAt: new Date().toISOString(),
		server,
		swarmServices,
		externalHealth,
		deployments,
		backup,
		activity,
		attention,
		shortcuts: config.shortcuts,
		thresholds: config.thresholds,
	};
});

function recentActivity(...sources: ActivityEvent[][]): ActivityEvent[] {
	return sources
		.flat()
		.filter((item) => !Number.isNaN(Date.parse(item.at)))
		.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
		.slice(0, 20);
}

function buildAttention(sections: Pick<DashboardPayload, "server" | "swarmServices" | "externalHealth" | "backup">, thresholds: ReturnType<typeof dashboardConfig>["thresholds"]): AttentionItem[] {
	const items: AttentionItem[] = [];
	if (sections.server.ok) {
		addResourceAttention(items, "cpu", "CPU", sections.server.data.cpu.usagePercent, thresholds.cpuWarningPercent, thresholds.cpuCriticalPercent);
		addResourceAttention(items, "ram", "RAM", sections.server.data.memory.usagePercent, thresholds.ramWarningPercent, thresholds.ramCriticalPercent);
		addResourceAttention(items, "disk", "Disk", sections.server.data.disk.usagePercent, thresholds.diskWarningPercent, thresholds.diskCriticalPercent);
	} else {
		items.push({ id: "server-unavailable", severity: "warning", title: "Server metrics unavailable", detail: sections.server.error });
	}
	if (sections.swarmServices.ok) {
		for (const service of sections.swarmServices.data) {
			if (service.state === "online") continue;
			items.push({ id: `service-${service.name}`, severity: service.state === "offline" ? "critical" : "warning", title: `${service.name} is ${service.state}`, detail: service.detail });
		}
	} else {
		items.push({ id: "docker-unavailable", severity: "warning", title: "Swarm status unavailable", detail: sections.swarmServices.error });
	}
	if (sections.externalHealth.ok) {
		for (const check of sections.externalHealth.data) {
			if (check.state === "online") continue;
			items.push({ id: `external-${check.id}`, severity: check.state === "offline" ? "critical" : "warning", title: `${check.name} is ${check.state}`, detail: check.detail });
		}
	} else {
		items.push({ id: "external-unavailable", severity: "warning", title: "External health unavailable", detail: sections.externalHealth.error });
	}
	if (!sections.backup.ok) items.push({ id: "backup-unavailable", severity: "warning", title: "Backup status unavailable", detail: sections.backup.error });
	else if (sections.backup.data.state !== "online")
		items.push({ id: "backup-late", severity: sections.backup.data.state === "offline" ? "critical" : "warning", title: "Database backup needs attention", detail: sections.backup.data.detail });
	return items;
}

function addResourceAttention(items: AttentionItem[], id: string, label: string, value: number, warning: number, critical: number): void {
	if (value < warning) return;
	const severity = value >= critical ? "critical" : "warning";
	items.push({
		id,
		severity,
		title: `${label} usage is ${severity === "critical" ? "critical" : "high"}`,
		detail: `${value}% used · ${severity} threshold ${severity === "critical" ? critical : warning}%`,
	});
}

function dashboardSelfCheck(): ExternalCheck {
	return {
		id: "dashboard-self",
		name: "Ops Dashboard",
		state: "online",
		detail: "dashboard API is responding",
		source: "dashboard",
		checkedAt: new Date().toISOString(),
	};
}

async function section<T>(read: () => Promise<T>): Promise<Section<T>> {
	try {
		return { ok: true, data: await read() };
	} catch (error) {
		console.error("[dashboard] section failed", error);
		return { ok: false, error: describe(error) };
	}
}

function describe(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(message)) return "could not reach the Docker socket proxy";
	if (/ETIMEDOUT|timeout|aborted/i.test(message)) return "timed out";
	if (/ENOENT/i.test(message)) return "configured path does not exist";
	if (/EACCES|EPERM/i.test(message)) return "permission denied";
	if (/is not set/i.test(message)) return message;
	return "unavailable";
}
