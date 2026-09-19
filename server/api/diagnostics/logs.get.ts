import type { ServiceLogs } from "#shared/types/dashboard";

export default defineEventHandler(async (event): Promise<ServiceLogs> => {
	const config = requireSensitiveDiagnostics(event);
	const service = getQuery(event).service;
	if (typeof service !== "string" || !service) throw createError({ statusCode: 400, statusMessage: "Service name required" });
	return readServiceLogs(config, service);
});
