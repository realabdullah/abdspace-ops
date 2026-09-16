import type { Deployment, HealthState, ServiceStatus } from "#shared/types/dashboard";
import type { NamedTarget } from "./dashboard-config";

interface SwarmService {
	ID: string;
	Spec: {
		Name: string;
		Labels?: Record<string, string>;
		Mode?: { Replicated?: { Replicas?: number }; Global?: object };
		TaskTemplate?: { ContainerSpec?: { Image?: string } };
	};
	CreatedAt?: string;
	UpdatedAt?: string;
}

interface SwarmTask {
	ID: string;
	ServiceID: string;
	DesiredState: string;
	CreatedAt?: string;
	UpdatedAt?: string;
	Status: { State: string; Message?: string; Err?: string; Timestamp?: string; ContainerStatus?: { ContainerID?: string } };
}

export interface SwarmSnapshot {
	services: SwarmService[];
	tasks: SwarmTask[];
}

export async function listSwarm(apiUrl: string): Promise<SwarmSnapshot> {
	if (!apiUrl) throw new Error("DOCKER_API_URL is not set");

	const [services, tasks] = await Promise.all([
		$fetch<SwarmService[]>("/services", { baseURL: apiUrl, method: "GET", timeout: 4000, retry: 0 }),
		$fetch<SwarmTask[]>("/tasks", { baseURL: apiUrl, method: "GET", timeout: 4000, retry: 0 }),
	]);

	return { services: services ?? [], tasks: tasks ?? [] };
}

function findService(snapshot: SwarmSnapshot, match: string): SwarmService | undefined {
	const wanted = match.replace(/^\//, "");
	return (
		snapshot.services.find((service) => service.Spec.Name === wanted) ??
		snapshot.services.find((service) => service.Spec.Name.startsWith(wanted)) ??
		snapshot.services.find((service) => service.Spec.Name.endsWith(`_${wanted}`))
	);
}

function countReplicas(snapshot: SwarmSnapshot, service: SwarmService): { running: number; desired: number } {
	const tasks = snapshot.tasks.filter((task) => task.ServiceID === service.ID);
	const running = tasks.filter((task) => task.DesiredState === "running" && task.Status.State === "running").length;

	const replicated = service.Spec.Mode?.Replicated?.Replicas;
	const desired = typeof replicated === "number" ? replicated : tasks.filter((task) => task.DesiredState === "running").length;

	return { running, desired };
}

function tasksFor(snapshot: SwarmSnapshot, service: SwarmService): SwarmTask[] {
	return snapshot.tasks
		.filter((task) => task.ServiceID === service.ID)
		.sort((a, b) => Date.parse(b.Status.Timestamp ?? b.UpdatedAt ?? b.CreatedAt ?? "") - Date.parse(a.Status.Timestamp ?? a.UpdatedAt ?? a.CreatedAt ?? ""));
}

function healthOf(snapshot: SwarmSnapshot, service: SwarmService): { state: HealthState; detail: string; replicas: { running: number; desired: number } } {
	const replicas = countReplicas(snapshot, service);

	if (replicas.desired === 0) return { state: "offline", detail: "scaled to 0", replicas };
	if (replicas.running >= replicas.desired) return { state: "online", detail: `${replicas.running}/${replicas.desired} running`, replicas };

	const failure = tasksFor(snapshot, service)
		.filter((task) => task.Status.State !== "running")
		.map((task) => task.Status.Err || task.Status.Message)
		.filter(Boolean)
		.at(0);
	const detail = `${replicas.running}/${replicas.desired} running${failure ? ` — ${failure.slice(0, 60)}` : ""}`;

	return { state: replicas.running === 0 ? "offline" : "degraded", detail, replicas };
}

export function toSwarmServices(snapshot: SwarmSnapshot, targets: NamedTarget[]): ServiceStatus[] {
	return targets.map((target) => {
		const service = findService(snapshot, target.match);
		if (!service) {
			return {
				id: null,
				name: target.label,
				state: "unknown",
				detail: "configured service was not found",
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
		}
		const tasks = tasksFor(snapshot, service);
		const currentTask = tasks.find((task) => task.DesiredState === "running") ?? tasks[0];
		const recentFailure = tasks.find((task) => task.Status.State !== "running" && (task.Status.Err || task.Status.Message));
		return {
			id: service.ID,
			name: target.label,
			...healthOf(snapshot, service),
			source: "docker",
			image: service.Spec.TaskTemplate?.ContainerSpec?.Image ?? null,
			taskState: currentTask?.Status.State ?? null,
			taskId: currentTask?.Status.ContainerStatus?.ContainerID ?? currentTask?.ID ?? null,
			lastRestartAt: tasks.length > 1 ? (currentTask?.Status.Timestamp ?? currentTask?.UpdatedAt ?? currentTask?.CreatedAt ?? null) : null,
			createdAt: service.CreatedAt ?? null,
			updatedAt: service.UpdatedAt ?? null,
			failureReason: recentFailure?.Status.Err || recentFailure?.Status.Message || null,
		};
	});
}

export function toSwarmDeployments(snapshot: SwarmSnapshot, targets: NamedTarget[]): Deployment[] {
	return targets.map((target) => {
		const service = findService(snapshot, target.match);
		const image = service?.Spec.TaskTemplate?.ContainerSpec?.Image ?? null;
		const labels = service?.Spec.Labels ?? {};
		const parsed = deploymentImage(image);
		return {
			name: target.label,
			image: parsed.image,
			digest: parsed.digest,
			immutableTag: parsed.immutableTag,
			deployedAt: service?.UpdatedAt ?? service?.CreatedAt ?? null,
			commitSha: labels["org.opencontainers.image.revision"] ?? labels["com.docker.compose.project.config_files.sha256"] ?? parsed.commitSha,
		};
	});
}

function deploymentImage(value: string | null): Pick<Deployment, "image" | "digest" | "immutableTag" | "commitSha"> {
	if (!value) return { image: null, digest: null, immutableTag: null, commitSha: null };
	const [taggedImage, digest = null] = value.split("@", 2);
	const lastSlash = taggedImage!.lastIndexOf("/");
	const colon = taggedImage!.lastIndexOf(":");
	const tag = colon > lastSlash ? taggedImage!.slice(colon + 1) : null;
	const immutableTag = tag && /^(?:sha[-_])?[a-f0-9]{7,64}$/i.test(tag) ? tag : null;
	const commitSha = immutableTag?.replace(/^sha[-_]/i, "") ?? null;
	return { image: taggedImage!, digest, immutableTag, commitSha };
}
