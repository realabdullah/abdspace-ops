import type { ActivityEvent, ExternalCheck, HealthState } from "#shared/types/dashboard";

interface KumaStatusPage {
	publicGroupList?: Array<{ monitorList?: Array<{ id: number; name: string }> }>;
}

interface KumaHeartbeats {
	heartbeatList?: Record<string, Array<{ status: number; time: string; msg: string }>>;
}

function stateFor(status: number | undefined): HealthState {
	if (status === 1) return "online";
	if (status === 0) return "offline";
	if (status === 2 || status === 3) return "degraded";
	return "unknown";
}

export async function readKumaSnapshot(baseURL: string, slug: string): Promise<{ checks: ExternalCheck[]; activity: ActivityEvent[] }> {
	if (!baseURL || !slug) return { checks: [], activity: [] };

	const [page, beats] = await Promise.all([
		$fetch<KumaStatusPage>(`/api/status-page/${encodeURIComponent(slug)}`, { baseURL, timeout: 4000, retry: 0 }),
		$fetch<KumaHeartbeats>(`/api/status-page/heartbeat/${encodeURIComponent(slug)}`, { baseURL, timeout: 4000, retry: 0 }),
	]);

	const monitors = (page.publicGroupList ?? []).flatMap((group) => group.monitorList ?? []);

	const checks = monitors.map((monitor) => {
		const latest = beats.heartbeatList?.[String(monitor.id)]?.at(-1);
		return {
			id: `kuma-${monitor.id}`,
			name: monitor.name,
			state: stateFor(latest?.status),
			detail: latest?.msg?.slice(0, 80) || (latest ? "" : "no heartbeat yet"),
			source: "uptime-kuma" as const,
			checkedAt: latest?.time ?? null,
		};
	});
	const activity = monitors.flatMap((monitor) => {
		const heartbeats = beats.heartbeatList?.[String(monitor.id)] ?? [];
		return heartbeats.flatMap((heartbeat, index): ActivityEvent[] => {
			const previous = heartbeats[index - 1];
			if (!previous || previous.status === heartbeat.status || Number.isNaN(Date.parse(heartbeat.time))) return [];
			const state = stateFor(heartbeat.status);
			const action = state === "online" ? "recovered" : state === "offline" ? "went offline" : "became degraded";
			return [{ id: `kuma-${monitor.id}-${heartbeat.time}-${heartbeat.status}`, at: heartbeat.time, kind: "external", title: `${monitor.name} ${action}`, detail: heartbeat.msg || null, state }];
		});
	});
	return { checks, activity };
}

export async function readKumaChecks(baseURL: string, slug: string): Promise<ExternalCheck[]> {
	return (await readKumaSnapshot(baseURL, slug)).checks;
}
