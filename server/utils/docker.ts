import type { Deployment, HealthState, ServiceStatus } from "#shared/types/dashboard";
import type { DashboardConfig, NamedTarget } from "./dashboard-config";

interface DockerContainer {
	Id: string;
	Names: string[];
	Image: string;
	ImageID: string;
	State: string;
	Status: string;
	Created: number;
	Labels: Record<string, string>;
}

export async function listContainers(apiUrl: string): Promise<DockerContainer[]> {
	if (!apiUrl) throw new Error("DOCKER_API_URL is not set");

	const containers = await $fetch<DockerContainer[]>("/containers/json", {
		baseURL: apiUrl,
		query: { all: "true" },
		method: "GET",
		timeout: 4000,
		retry: 0,
	});

	return Array.isArray(containers) ? containers : [];
}

function findContainer(containers: DockerContainer[], match: string): DockerContainer | undefined {
	const names = (container: DockerContainer) => container.Names.map((name) => name.replace(/^\//, ""));
	const wanted = match.replace(/^\//, "");

	const exact = containers.find((container) => names(container).includes(wanted));
	if (exact) return exact;

	const byPrefix = containers.filter((container) => names(container).some((name) => name.startsWith(wanted)));
	if (byPrefix.length > 1) {
		return byPrefix.sort((a, b) => Number(b.State === "running") - Number(a.State === "running") || b.Created - a.Created)[0];
	}
	return byPrefix[0] ?? containers.find((container) => container.Labels?.["com.docker.compose.service"] === wanted);
}

function healthOf(container: DockerContainer): { state: HealthState; detail: string } {
	const status = container.Status || "";

	if (container.State === "running") {
		if (/\(unhealthy\)/i.test(status)) return { state: "degraded", detail: "running, healthcheck failing" };
		if (/\(health: starting\)/i.test(status)) return { state: "degraded", detail: "starting up" };
		return { state: "online", detail: status || "running" };
	}
	if (container.State === "restarting") return { state: "degraded", detail: "restarting" };
	if (container.State === "paused") return { state: "degraded", detail: "paused" };
	return { state: "offline", detail: status || container.State || "not running" };
}

export function toServices(containers: DockerContainer[], targets: NamedTarget[]): ServiceStatus[] {
	return targets.map((target) => {
		const container = findContainer(containers, target.match);
		if (!container)
			return {
				id: null,
				name: target.label,
				state: "unknown",
				detail: "configured container was not found",
				source: "docker",
				replicas: null,
				image: null,
				taskState: null,
				taskId: null,
				lastRestartAt: null,
				createdAt: null,
				updatedAt: null,
				failureReason: null,
			};
		return {
			id: container.Id,
			name: target.label,
			...healthOf(container),
			source: "docker",
			replicas: null,
			image: container.Image,
			taskState: container.State,
			taskId: container.Id,
			lastRestartAt: null,
			createdAt: container.Created ? new Date(container.Created * 1000).toISOString() : null,
			updatedAt: null,
			failureReason: container.State === "running" ? null : container.Status,
		};
	});
}

export function toDeployments(containers: DockerContainer[], targets: NamedTarget[]): Deployment[] {
	return targets.map((target) => {
		const container = findContainer(containers, target.match);
		return {
			name: target.label,
			image: container?.Image ?? null,
			digest: container?.ImageID ?? null,
			immutableTag: null,
			deployedAt: container?.Created ? new Date(container.Created * 1000).toISOString() : null,
			commitSha: container?.Labels?.["org.opencontainers.image.revision"] ?? null,
		};
	});
}

export async function readDockerSnapshot(config: DashboardConfig["docker"]): Promise<{ services: ServiceStatus[]; deployments: Deployment[] }> {
	if (config.mode === "swarm") {
		const snapshot = await listSwarm(config.apiUrl);
		return {
			services: config.services.length ? toSwarmServices(snapshot, config.services) : [],
			deployments: toSwarmDeployments(snapshot, config.deployments),
		};
	}

	const containers = await listContainers(config.apiUrl);
	return {
		services: config.services.length ? toServices(containers, config.services) : [],
		deployments: toDeployments(containers, config.deployments),
	};
}
