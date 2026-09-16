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
	Status: { State: string; Message?: string; Err?: string };
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

function healthOf(snapshot: SwarmSnapshot, service: SwarmService): { state: HealthState; detail: string; replicas: { running: number; desired: number } } {
	const replicas = countReplicas(snapshot, service);

	if (replicas.desired === 0) return { state: "offline", detail: "scaled to 0", replicas };
	if (replicas.running >= replicas.desired) return { state: "online", detail: `${replicas.running}/${replicas.desired} running`, replicas };

	const failure = snapshot.tasks
		.filter((task) => task.ServiceID === service.ID && task.Status.State !== "running")
		.map((task) => task.Status.Err || task.Status.Message)
		.filter(Boolean)
		.at(-1);
	const detail = `${replicas.running}/${replicas.desired} running${failure ? ` — ${failure.slice(0, 60)}` : ""}`;

	return { state: replicas.running === 0 ? "offline" : "degraded", detail, replicas };
}

export function toSwarmServices(snapshot: SwarmSnapshot, targets: NamedTarget[]): ServiceStatus[] {
	return targets.map((target) => {
		const service = findService(snapshot, target.match);
		if (!service) return { name: target.label, state: "unknown", detail: "no service matched", source: "docker", replicas: null };
		return { name: target.label, ...healthOf(snapshot, service), source: "docker" };
	});
}

export function toSwarmDeployments(snapshot: SwarmSnapshot, targets: NamedTarget[]): Deployment[] {
	return targets.map((target) => {
		const service = findService(snapshot, target.match);
		const image = service?.Spec.TaskTemplate?.ContainerSpec?.Image ?? null;
		return {
			name: target.label,
			image: image ? image.split("@")[0]! : null,
			imageId: image?.includes("@") ? image.slice(image.indexOf("@") + 1, image.indexOf("@") + 20) : null,
			createdAt: service?.UpdatedAt ?? service?.CreatedAt ?? null,
		};
	});
}
