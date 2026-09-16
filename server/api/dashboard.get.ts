import type { DashboardPayload, ExternalCheck, Section } from "#shared/types/dashboard";

export default defineEventHandler(async (event): Promise<DashboardPayload> => {
	const config = dashboardConfig();

	const docker = readDockerSnapshot(config.docker);
	docker.catch(() => {});

	const [server, swarmServices, externalHealth, deployments, backup] = await Promise.all([
		section(() => readServerStats(config.diskPath)),
		section(async () => (await docker).services),
		section(async (): Promise<ExternalCheck[]> => {
			const self = dashboardSelfCheck();
			if (!config.kuma.baseUrl || !config.kuma.statusSlug) return [self];
			try {
				return [self, ...(await readKumaChecks(config.kuma.baseUrl, config.kuma.statusSlug))];
			} catch (error) {
				console.error("[dashboard] Uptime Kuma check failed", error);
				return [self, { id: "kuma-unavailable", name: "Uptime Kuma", state: "unknown", detail: "status page unavailable", source: "uptime-kuma", checkedAt: null }];
			}
		}),
		section(async () => (await docker).deployments),
		section(() => readBackupStatus(config.backup)),
	]);

	setResponseHeader(event, "cache-control", "no-store");

	return {
		generatedAt: new Date().toISOString(),
		server,
		swarmServices,
		externalHealth,
		deployments,
		backup,
		shortcuts: config.shortcuts,
	};
});

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
