<script setup lang="ts">
import type { ServiceStatus } from "#shared/types/dashboard";
import type { LedgerCell } from "~/components/LedgerStrip.vue";

const { data, error, pending, refresh, history, live, verdict, staleSeconds } = useOpsDashboard();
useStatusSignal(
	verdict,
	computed(() => Boolean(error.value))
);

const inspected = ref<ServiceStatus | null>(null);
const inspectByName = (name: string) => {
	const service = data.value?.swarmServices.ok ? data.value.swarmServices.data.find((item) => item.name === name) : null;
	if (service) inspected.value = service;
};

const ledger = computed<LedgerCell[]>(() => {
	const payload = data.value;
	if (!payload) return [];
	const services = payload.swarmServices;
	const checks = payload.externalHealth;
	const backup = payload.backup;
	const deployedAt = payload.deployments.ok
		? payload.deployments.data
				.map((deployment) => deployment.deployedAt)
				.filter((at): at is string => Boolean(at) && !Number.isNaN(Date.parse(at!)))
				.sort((a, b) => Date.parse(b) - Date.parse(a))
				.at(0)
		: null;
	const running = services.ok ? services.data.filter((service) => service.state === "online").length : 0;
	const passing = checks.ok ? checks.data.filter((check) => check.state === "online").length : 0;

	return [
		{
			label: "Services",
			value: services.ok ? `${running}/${services.data.length}` : "—",
			sub: services.ok ? "running" : "swarm unavailable",
			tone: services.ok ? (running === services.data.length ? "ok" : "crit") : "idle",
		},
		{
			label: "Checks",
			value: checks.ok ? `${passing}/${checks.data.length}` : "—",
			sub: checks.ok ? "passing" : "checks unavailable",
			tone: checks.ok ? (passing === checks.data.length ? "ok" : "crit") : "idle",
		},
		{
			label: "Backup",
			value: backup.ok && backup.data.ageSeconds !== null ? formatDurationShort(backup.data.ageSeconds) : "—",
			sub: backup.ok ? backup.data.detail : "log unavailable",
			tone: backup.ok ? TONE[backup.data.state] : "idle",
		},
		{
			label: "Last deploy",
			value: deployedAt ? formatDurationShort(Math.max(0, (Date.now() - Date.parse(deployedAt)) / 1000)) : "—",
			sub: deployedAt ? "ago" : "no deploy recorded",
		},
	];
});
</script>

<template>
	<div class="min-h-svh pb-16">
		<ChromeBar
			:hostname="data?.server.ok ? data.server.data.hostname : null"
			:generated-at="data?.generatedAt ?? null"
			:stale-seconds="staleSeconds"
			:pending="pending"
			:live="live"
			@refresh="refresh()"
			@update:live="live = $event"
		/>

		<section v-if="error" class="border-crit/40 bg-crit/[0.09] border-b">
			<div class="mx-auto flex max-w-[88rem] flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:px-6 sm:py-8">
				<div class="flex items-start gap-4 sm:items-center sm:gap-5">
					<span class="text-crit relative mt-1.5 flex size-8 shrink-0 items-center justify-center sm:mt-0">
						<span class="beacon absolute inset-2 rounded-full" />
						<svg viewBox="0 0 28 28" class="relative size-8" aria-hidden="true"><rect x="4.2" y="4.2" width="19.6" height="19.6" fill="currentColor" /></svg>
					</span>
					<div class="min-w-0">
						<h1 class="readout text-crit text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.06] font-semibold tracking-[-0.01em] text-pretty uppercase">Dashboard unreachable</h1>
						<p class="text-ink-2 mt-3 text-sm text-pretty">
							{{
								error.statusCode === 403
									? "This request did not arrive through Cloudflare Access, so the API refused it."
									: "The dashboard API did not answer. The container may be restarting."
							}}
						</p>
						<p v-if="data && staleSeconds !== null" class="readout text-ink-3 mt-1.5 text-xs">
							Showing the last reading, taken {{ formatDurationShort(staleSeconds) }} ago at {{ formatClock(data.generatedAt) }}.
						</p>
					</div>
				</div>
				<UButton color="neutral" variant="outline" label="Try again" icon="i-lucide-refresh-cw" :loading="pending" class="shrink-0 self-start sm:self-auto" @click="refresh()" />
			</div>
		</section>

		<section v-else-if="!data" class="border-line border-b" aria-busy="true">
			<div class="mx-auto flex max-w-[88rem] items-center gap-5 px-4 py-6 sm:px-6 sm:py-8">
				<span class="bg-raised size-8 shrink-0 animate-pulse rounded-full" />
				<div class="w-full space-y-3">
					<div class="bg-raised h-8 w-72 max-w-full animate-pulse" />
					<div class="bg-raised h-3.5 w-96 max-w-full animate-pulse" style="animation-delay: 120ms" />
				</div>
			</div>
		</section>

		<VerdictBand v-else-if="verdict && data" :verdict="verdict" :server="data.server" />

		<main class="mx-auto max-w-[88rem] space-y-4 px-4 pt-4 sm:px-6 sm:pt-6">
			<AttentionList v-if="data?.attention.length" :items="data.attention" @inspect="inspectByName" />

			<section v-if="data" class="panel">
				<LedgerStrip :cells="ledger" />
				<div v-if="data.server.ok" class="divide-line border-line grid border-t sm:grid-cols-3 sm:divide-x">
					<HostMeter
						label="CPU"
						:value="data.server.data.cpu.usagePercent"
						:primary="`${data.server.data.cpu.usagePercent}%`"
						:secondary="`load ${data.server.data.cpu.load.map((entry) => entry.toFixed(2)).join(' / ')} · ${data.server.data.cpu.cores} cores`"
						:warning="data.thresholds.cpuWarningPercent"
						:critical="data.thresholds.cpuCriticalPercent"
						:history="history.map((sample) => sample.cpu)"
					/>
					<HostMeter
						label="Memory"
						:value="data.server.data.memory.usagePercent"
						:primary="`${data.server.data.memory.usagePercent}%`"
						:secondary="formatBytesPair(data.server.data.memory.usedBytes, data.server.data.memory.totalBytes)"
						:warning="data.thresholds.ramWarningPercent"
						:critical="data.thresholds.ramCriticalPercent"
						:history="history.map((sample) => sample.memory)"
					/>
					<HostMeter
						label="Disk"
						:value="data.server.data.disk.usagePercent"
						:primary="`${data.server.data.disk.usagePercent}%`"
						:secondary="`${formatBytesPair(data.server.data.disk.usedBytes, data.server.data.disk.totalBytes)} · ${formatBytes(data.server.data.disk.totalBytes - data.server.data.disk.usedBytes)} free`"
						:warning="data.thresholds.diskWarningPercent"
						:critical="data.thresholds.diskCriticalPercent"
						:history="history.map((sample) => sample.disk)"
					/>
				</div>
				<div v-else class="border-line border-t px-4 py-4">
					<p class="text-warn label">Host metrics unavailable</p>
					<p class="text-ink-2 mt-2 text-sm">{{ data.server.error }}</p>
					<p v-if="hintFor(data.server.error)" class="text-ink-3 mt-1 text-xs">{{ hintFor(data.server.error) }}</p>
				</div>
			</section>

			<div v-if="data" class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
				<div class="min-w-0 space-y-4">
					<ServicesPanel :section="data?.swarmServices" :loading="pending" @inspect="inspected = $event" />
					<DeploymentsPanel :section="data?.deployments" :loading="pending" />
				</div>

				<div class="min-w-0 space-y-4 lg:sticky lg:top-16">
					<BackupPanel :section="data?.backup" :loading="pending" />
					<ChecksPanel :section="data?.externalHealth" :loading="pending" />
					<ToolsPanel v-if="data?.shortcuts.length" :shortcuts="data.shortcuts" />
				</div>
			</div>

			<ActivityPanel v-if="data?.activity.length" :events="data.activity" />

			<p class="text-ink-3 pt-2 text-xs">
				Read-only. Press <kbd class="readout border-line text-ink-2 border px-1">R</kbd> to refresh, <kbd class="readout border-line text-ink-2 border px-1">L</kbd> for live polling. Session
				history is held in this tab only.
			</p>
		</main>

		<ServiceDetailsSlideover :service="inspected" @close="inspected = null" />
	</div>
</template>
