import type { DashboardPayload, Section, ServiceStatus } from "#shared/types/dashboard";

export default defineEventHandler(async (event): Promise<DashboardPayload> => {
	const config = dashboardConfig();

	const docker = readDockerSnapshot(config.docker);
	docker.catch(() => {});

	const [server, services, deployments, backup] = await Promise.all([
		section(() => readServerStats(config.diskPath)),
		section(async (): Promise<ServiceStatus[]> => {
			const fromDocker = (await docker).services;
			const fromKuma = await readKumaServices(config.kuma.baseUrl, config.kuma.statusSlug).catch(() => []);
			return mergeServices(fromDocker, fromKuma);
		}),
		section(async () => (await docker).deployments),
		section(() => readBackupStatus(config.backup)),
	]);

	setResponseHeader(event, "cache-control", "no-store");

	return {
		generatedAt: new Date().toISOString(),
		server,
		services,
		deployments,
		backup,
		shortcuts: config.shortcuts,
	};
});

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
