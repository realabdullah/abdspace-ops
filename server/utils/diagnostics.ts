import type { H3Event } from "h3";
import type { ServiceLogs } from "#shared/types/dashboard";
import type { DashboardConfig } from "./dashboard-config";

const MAX_LOG_BYTES = 256 * 1024;

export function requireSensitiveDiagnostics(event: H3Event): DashboardConfig {
	const config = dashboardConfig();
	if (!config.sensitiveDiagnosticsEnabled) throw createError({ statusCode: 403, statusMessage: "Diagnostics disabled" });
	setResponseHeader(event, "cache-control", "no-store");
	return config;
}

export async function readServiceLogs(config: DashboardConfig, name: string): Promise<ServiceLogs> {
	if (config.docker.mode !== "swarm") throw createError({ statusCode: 400, statusMessage: "Swarm mode required" });
	const target = config.docker.services.find((service) => service.label === name);
	if (!target) throw createError({ statusCode: 404, statusMessage: "Service not configured" });
	const service = (await readDockerSnapshot(config.docker)).services.find((item) => item.name === target.label);
	if (!service?.id) throw createError({ statusCode: 404, statusMessage: "Service not found" });

	const url = new URL(`/services/${encodeURIComponent(service.id)}/logs`, `${config.docker.apiUrl}/`);
	url.searchParams.set("stdout", "1");
	url.searchParams.set("stderr", "1");
	url.searchParams.set("timestamps", "1");
	url.searchParams.set("tail", "100");
	const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error", cache: "no-store" });
	if (!response.ok) throw createError({ statusCode: 502, statusMessage: "Service logs unavailable" });
	const reader = response.body?.getReader();
	if (!reader) return { service: name, lines: "", truncated: false };
	const chunks: Uint8Array[] = [];
	let size = 0;
	let truncated = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const remaining = MAX_LOG_BYTES - size;
			if (value.length > remaining) {
				chunks.push(value.subarray(0, remaining));
				truncated = true;
				break;
			}
			chunks.push(value);
			size += value.length;
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
	const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return { service: name, lines: decodeDockerLogs(bytes), truncated };
}

function decodeDockerLogs(bytes: Uint8Array): string {
	if (bytes.length < 8 || ![1, 2].includes(bytes[0]!) || bytes[1] !== 0 || bytes[2] !== 0 || bytes[3] !== 0) return new TextDecoder().decode(bytes);
	const lines: string[] = [];
	let offset = 0;
	while (offset + 8 <= bytes.length) {
		const length = ((bytes[offset + 4]! << 24) | (bytes[offset + 5]! << 16) | (bytes[offset + 6]! << 8) | bytes[offset + 7]!) >>> 0;
		const end = Math.min(bytes.length, offset + 8 + length);
		lines.push(new TextDecoder().decode(bytes.subarray(offset + 8, end)));
		offset = end;
	}
	return lines.join("");
}
