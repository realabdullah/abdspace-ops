export default defineEventHandler(async (event) => {
	const config = requireSensitiveDiagnostics(event);
	const results = await Promise.allSettled([
		readServerStats(config.diskPath),
		readDockerSnapshot(config.docker),
		readKumaSnapshot(config.kuma.baseUrl, config.kuma.statusSlug),
		readBackupStatus(config.backup),
	]);
	const section = <T>(result: PromiseSettledResult<T>): { data: T | null; available: boolean } =>
		result.status === "fulfilled" ? { data: result.value, available: true } : { data: null, available: false };
	const [server, docker, external, backup] = results;
	const dockerServices = docker!.status === "fulfilled" ? { available: true, data: docker!.value.services } : { available: false, data: null };
	const dockerDeployments = docker!.status === "fulfilled" ? { available: true, data: docker!.value.deployments } : { available: false, data: null };
	const externalChecks = external!.status === "fulfilled" ? { available: true, data: external!.value.checks } : { available: false, data: null };
	const snapshot = {
		generatedAt: new Date().toISOString(),
		server: section(server!),
		services: dockerServices,
		deployments: dockerDeployments,
		externalHealth: externalChecks,
		backup: section(backup!),
	};
	setResponseHeader(event, "content-type", "application/json; charset=utf-8");
	setResponseHeader(event, "content-disposition", `attachment; filename="ops-diagnostic-${new Date().toISOString().slice(0, 10)}.json"`);
	return snapshot;
});
