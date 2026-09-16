import type { DashboardPayload } from "#shared/types/dashboard";
import type { Tone } from "~/utils/state";

export interface MetricSample {
	at: number;
	cpu: number;
	memory: number;
	disk: number;
}

export interface Verdict {
	tone: Tone;
	headline: string;
	detail: string;
	critical: number;
	warnings: number;
}

const HISTORY_LIMIT = 90;
const LIVE_INTERVAL_MS = 15_000;
const LIVE_STORAGE_KEY = "abdspace-ops:live";

export function useOpsDashboard() {
	const { data: response, status, error, refresh } = useFetch<DashboardPayload>("/api/dashboard", { lazy: true, server: false, cache: "no-store" });

	/** A failed refresh must never blank the instruments: keep the last reading and mark its age. */
	const data = shallowRef<DashboardPayload | null>(null);
	watch(response, (payload) => {
		if (payload) data.value = payload;
	});

	const history = ref<MetricSample[]>([]);
	const live = ref(false);
	const now = ref(Date.now());
	const pending = computed(() => status.value === "pending");

	watch(
		() => data.value?.generatedAt,
		() => {
			const server = data.value?.server;
			if (!server?.ok) return;
			const at = Date.parse(data.value!.generatedAt);
			if (history.value.at(-1)?.at === at) return;
			history.value = [...history.value, { at, cpu: server.data.cpu.usagePercent, memory: server.data.memory.usagePercent, disk: server.data.disk.usagePercent }].slice(-HISTORY_LIMIT);
		}
	);

	const staleSeconds = computed(() => {
		if (!data.value) return null;
		const at = Date.parse(data.value.generatedAt);
		return Number.isNaN(at) ? null : Math.max(0, Math.round((now.value - at) / 1000));
	});

	const verdict = computed<Verdict | null>(() => {
		if (!data.value) return null;
		const { attention, server, swarmServices, externalHealth, backup } = data.value;
		const critical = attention.filter((item) => item.severity === "critical").length;
		const warnings = attention.length - critical;
		const top = [...attention]
			.sort((a, b) => Number(b.severity === "critical") - Number(a.severity === "critical"))
			.slice(0, 2)
			.map((item) => item.title)
			.join(" · ");

		if (critical) {
			const faults = `${critical} critical ${critical === 1 ? "fault" : "faults"}`;
			return { tone: "crit", headline: warnings ? `${faults}, ${warnings} ${warnings === 1 ? "warning" : "warnings"}` : faults, detail: top, critical, warnings };
		}
		if (warnings) {
			return { tone: "warn", headline: `${warnings} ${warnings === 1 ? "warning" : "warnings"} to review`, detail: top, critical, warnings };
		}
		if (!server.ok || !swarmServices.ok || !externalHealth.ok || !backup.ok) {
			return { tone: "idle", headline: "Partial data", detail: "One or more sources did not answer", critical, warnings };
		}

		const services = swarmServices.data.length;
		const checks = externalHealth.data.length;
		const age = backup.data.ageSeconds !== null ? formatAge(backup.data.ageSeconds) : "unknown";
		return {
			tone: "ok",
			headline: "All systems nominal",
			detail: `${services} ${services === 1 ? "service" : "services"} running · ${checks} ${checks === 1 ? "check" : "checks"} passing · backup ${age}`,
			critical,
			warnings,
		};
	});

	if (import.meta.client) {
		let timer: ReturnType<typeof setInterval> | null = null;
		const clock = setInterval(() => (now.value = Date.now()), 1000);

		const stopPolling = () => {
			if (timer) clearInterval(timer);
			timer = null;
		};
		const startPolling = () => {
			stopPolling();
			timer = setInterval(() => {
				if (document.visibilityState === "visible" && !pending.value) refresh();
			}, LIVE_INTERVAL_MS);
		};

		watch(live, (enabled) => {
			localStorage.setItem(LIVE_STORAGE_KEY, String(enabled));
			if (enabled) {
				startPolling();
				refresh();
			} else stopPolling();
		});

		const onKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, textarea, select, [contenteditable]")) return;
			if (event.key === "r") {
				event.preventDefault();
				refresh();
			}
			if (event.key === "l") {
				event.preventDefault();
				live.value = !live.value;
			}
		};

		onMounted(() => {
			live.value = localStorage.getItem(LIVE_STORAGE_KEY) === "true";
			window.addEventListener("keydown", onKey);
		});
		onBeforeUnmount(() => {
			stopPolling();
			clearInterval(clock);
			window.removeEventListener("keydown", onKey);
		});
	}

	return { data, error, pending, refresh, history, live, verdict, staleSeconds };
}
