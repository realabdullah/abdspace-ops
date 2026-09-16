import assert from "node:assert/strict";
import test from "node:test";
import { toSwarmActivity, toSwarmServices, type SwarmSnapshot } from "./docker-swarm.ts";

test("reports desired and running replicas with task detail", () => {
	const snapshot: SwarmSnapshot = {
		services: [
			{
				ID: "service-id",
				Spec: { Name: "example-web-abc", Mode: { Replicated: { Replicas: 2 } }, TaskTemplate: { ContainerSpec: { Image: "ghcr.io/abd/web:abc1234@sha256:digest" } } },
				CreatedAt: "2026-09-15T10:00:00Z",
				UpdatedAt: "2026-09-16T10:00:00Z",
			},
		],
		tasks: [
			{ ID: "task-1", ServiceID: "service-id", DesiredState: "running", Status: { State: "running", Timestamp: "2026-09-16T10:01:00Z", ContainerStatus: { ContainerID: "container-1" } } },
			{ ID: "task-2", ServiceID: "service-id", DesiredState: "running", Status: { State: "failed", Timestamp: "2026-09-16T10:02:00Z", Err: "image pull failed" } },
		],
	};

	const [service] = toSwarmServices(snapshot, [{ label: "Web", match: "example-web" }]);

	assert.equal(service?.state, "degraded");
	assert.deepEqual(service?.replicas, { running: 1, desired: 2 });
	assert.equal(service?.failureReason, "image pull failed");
	const activity = toSwarmActivity(snapshot, [{ label: "Web", match: "example-web" }], []);
	assert.equal(activity[0]?.title, "Web task failed");
	assert.equal(activity[1]?.title, "Web task started");
});

test("represents a missing configured service as unknown", () => {
	const [service] = toSwarmServices({ services: [], tasks: [] }, [{ label: "Missing", match: "missing" }]);

	assert.equal(service?.state, "unknown");
	assert.equal(service?.replicas, null);
});
