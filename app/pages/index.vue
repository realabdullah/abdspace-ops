<script setup lang="ts">
import type { DashboardPayload, HealthState, ServiceStatus } from "#shared/types/dashboard";

const { data, status, error, refresh } = await useFetch<DashboardPayload>("/api/dashboard", { lazy: true, server: false, cache: "no-store" });
const selectedService = ref<ServiceStatus | null>(null);
const pending = computed(() => status.value === "pending");
const refreshedAt = computed(() => (data.value ? formatClock(data.value.generatedAt) : null));
const onlineCount = (items: Array<{ state: HealthState }>) => items.filter((item) => item.state === "online").length;

const healthSummary = computed(() => {
	if (!data.value) return null;
	const { server, swarmServices, externalHealth, backup } = data.value;
	const sections = [server, swarmServices, externalHealth, backup];
	if (sections.some((section) => !section.ok)) return { label: "Some status unavailable", state: "unknown" as HealthState };
	if (!swarmServices.ok || !externalHealth.ok || !backup.ok) return { label: "Some status unavailable", state: "unknown" as HealthState };
	const states = [...swarmServices.data.map(({ state }) => state), ...externalHealth.data.map(({ state }) => state), backup.data.state];
	if (states.includes("offline")) return { label: "Systems need attention", state: "offline" as HealthState };
	if (states.includes("degraded")) return { label: "Some systems degraded", state: "degraded" as HealthState };
	if (states.includes("unknown")) return { label: "Some status unknown", state: "unknown" as HealthState };
	return { label: "All systems healthy", state: "online" as HealthState };
});

useHead({ title: "Server" });
</script>

<template>
	<UContainer class="max-w-5xl py-8">
		<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-highlighted text-lg font-semibold">Server</h1>
				<p class="text-muted text-sm">
					<template v-if="refreshedAt">Last refreshed at {{ refreshedAt }}</template
					><template v-else-if="pending">Loading…</template><template v-else>Not loaded</template>
				</p>
			</div>
			<UButton icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="subtle" size="sm" :loading="pending" @click="refresh()" />
		</header>

		<UAlert
			v-if="error"
			class="mb-6"
			color="error"
			variant="subtle"
			icon="i-lucide-circle-alert"
			title="Could not load the dashboard"
			:description="error.status === 403 ? 'This request did not come through Cloudflare Access.' : 'The dashboard API did not respond. Try refreshing.'"
		/>

		<section v-if="data && healthSummary" class="border-default bg-default mb-4 rounded-lg border p-4">
			<StatusDot :state="healthSummary.state" :label="healthSummary.label" />
			<div class="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
				<p class="text-muted text-sm">
					<span class="text-highlighted font-semibold tabular-nums">{{ data.swarmServices.ok ? `${onlineCount(data.swarmServices.data)}/${data.swarmServices.data.length}` : "—" }}</span>
					services online
				</p>
				<p class="text-muted text-sm">
					<span class="text-highlighted font-semibold tabular-nums">{{ data.externalHealth.ok ? `${onlineCount(data.externalHealth.data)}/${data.externalHealth.data.length}` : "—" }}</span>
					external checks healthy
				</p>
				<p class="text-muted text-sm">
					Latest backup
					<span class="text-highlighted font-semibold">{{ data.backup.ok && data.backup.data.ageSeconds !== null ? formatAge(data.backup.data.ageSeconds) : "unavailable" }}</span>
				</p>
				<p class="text-muted text-sm">
					RAM <span class="text-highlighted font-semibold tabular-nums">{{ data.server.ok ? `${data.server.data.memory.usagePercent}%` : "—" }}</span>
				</p>
				<p class="text-muted text-sm">
					Disk <span class="text-highlighted font-semibold tabular-nums">{{ data.server.ok ? `${data.server.data.disk.usagePercent}%` : "—" }}</span>
				</p>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-2">
			<DashboardCard title="Server" :section="data?.server" :loading="pending"
				><div v-if="data?.server.ok" class="divide-default divide-y">
					<StatRow label="CPU" :value="`${data.server.data.cpu.usagePercent}%`" :hint="`load ${data.server.data.cpu.load[0]}`" /><StatRow
						label="RAM"
						:value="formatBytesPair(data.server.data.memory.usedBytes, data.server.data.memory.totalBytes)"
						:hint="`${data.server.data.memory.usagePercent}%`"
					/><StatRow label="Disk" :value="formatBytesPair(data.server.data.disk.usedBytes, data.server.data.disk.totalBytes)" :hint="`${data.server.data.disk.usagePercent}%`" /><StatRow
						label="Uptime"
						:value="formatUptime(data.server.data.uptimeSeconds)"
					/></div
			></DashboardCard>

			<DashboardCard title="Swarm Services" :section="data?.swarmServices" :loading="pending">
				<div v-if="data?.swarmServices.ok" class="divide-default divide-y">
					<p v-if="!data.swarmServices.data.length" class="text-muted py-1 text-sm">No services configured.</p>
					<button
						v-for="service in data.swarmServices.data"
						:key="service.name"
						type="button"
						class="hover:bg-elevated focus-visible:ring-primary -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-md px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
						@click="selectedService = service"
					>
						<span class="text-highlighted min-w-0 truncate text-sm">{{ service.name }}</span
						><span class="flex shrink-0 items-center gap-3"
							><span class="text-dimmed font-mono text-xs tabular-nums">{{ service.replicas ? `${service.replicas.running}/${service.replicas.desired}` : "—/—" }}</span
							><StatusDot :state="service.state" /><UIcon name="i-lucide-chevron-right" class="text-dimmed size-4"
						/></span>
					</button>
				</div>
			</DashboardCard>

			<DashboardCard title="External Health" :section="data?.externalHealth" :loading="pending"
				><div v-if="data?.externalHealth.ok" class="divide-default divide-y">
					<div v-for="check in data.externalHealth.data" :key="check.id" class="flex items-center justify-between gap-4 py-2">
						<div class="min-w-0">
							<p class="text-highlighted truncate text-sm">{{ check.name }}</p>
							<p class="text-dimmed truncate text-xs">{{ check.detail || check.source }}</p>
						</div>
						<StatusDot :state="check.state" />
					</div></div
			></DashboardCard>

			<DashboardCard title="Deployments" :section="data?.deployments" :loading="pending">
				<div v-if="data?.deployments.ok" class="divide-default divide-y">
					<p v-if="!data.deployments.data.length" class="text-muted py-1 text-sm">No deployments configured.</p>
					<div v-for="deployment in data.deployments.data" :key="deployment.name" class="py-2">
						<div class="flex items-baseline justify-between gap-4">
							<span class="text-muted shrink-0 text-sm">{{ deployment.name }}</span
							><span v-if="deployment.image" class="min-w-0 truncate text-right font-mono text-xs" :title="deployment.image"
								><span class="text-dimmed">{{ splitImage(deployment.image).repository }}:</span><span class="text-highlighted">{{ splitImage(deployment.image).tag }}</span></span
							><span v-else class="text-dimmed text-sm">not deployed</span>
						</div>
						<p
							v-if="deployment.digest || deployment.commitSha || deployment.deployedAt"
							class="text-dimmed mt-1 truncate text-right font-mono text-xs"
							:title="deployment.digest || deployment.commitSha || undefined"
						>
							{{ deployment.commitSha ? `commit ${shortId(deployment.commitSha)}` : deployment.digest ? `digest ${shortId(deployment.digest)}` : ""
							}}<span v-if="deployment.deployedAt" class="font-sans"> · {{ formatMoment(deployment.deployedAt) }}</span>
						</p>
					</div>
				</div>
			</DashboardCard>

			<DashboardCard title="Backups" :section="data?.backup" :loading="pending"
				><div v-if="data?.backup.ok" class="space-y-2">
					<div class="flex items-center justify-between gap-4"><span class="text-muted text-sm">Latest PostgreSQL backup</span><StatusDot :state="data.backup.data.state" /></div>
					<StatRow
						label="Created"
						:value="data.backup.data.latestAt ? formatMoment(data.backup.data.latestAt) : 'None found'"
						:hint="data.backup.data.ageSeconds !== null ? formatAge(data.backup.data.ageSeconds) : null"
					/><StatRow label="Filename" :value="data.backup.data.filename || 'Unavailable'" /><StatRow
						label="Size"
						:value="data.backup.data.sizeBytes !== null ? formatBytes(data.backup.data.sizeBytes) : 'Unavailable'"
					/><StatRow label="Retention" :value="`${data.backup.data.retentionDays} days`" />
					<div v-if="data.backup.data.lastFailure" class="border-error/30 bg-error/5 rounded-md border p-2 text-xs">
						<p class="text-error font-medium">Last failure{{ data.backup.data.lastFailure.at ? ` · ${formatMoment(data.backup.data.lastFailure.at)}` : "" }}</p>
						<p class="text-muted mt-1 break-words">{{ data.backup.data.lastFailure.detail }}</p>
					</div>
				</div></DashboardCard
			>

			<DashboardCard v-if="data?.shortcuts.length" title="Shortcuts" class="md:col-span-2"
				><div class="flex flex-wrap gap-2">
					<UButton
						v-for="shortcut in data.shortcuts"
						:key="shortcut.url"
						:to="shortcut.url"
						:label="shortcut.label"
						target="_blank"
						rel="noopener noreferrer"
						color="neutral"
						variant="outline"
						size="sm"
						trailing-icon="i-lucide-arrow-up-right"
					/></div
			></DashboardCard>
		</div>

		<ServiceDetailsSlideover :service="selectedService" @close="selectedService = null" />
	</UContainer>
</template>
