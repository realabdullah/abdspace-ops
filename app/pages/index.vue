<script setup lang="ts">
import type { DashboardPayload, HealthState } from "#shared/types/dashboard";

const { data, status, error, refresh } = await useFetch<DashboardPayload>("/api/dashboard", {
	lazy: true,
	server: false,
	cache: "no-store",
});

const BACKUP_LABELS: Record<HealthState, string> = {
	online: "Current",
	degraded: "Late",
	offline: "Missing",
	unknown: "Not checked",
};

const pending = computed(() => status.value === "pending");
const refreshedAt = computed(() => (data.value ? formatClock(data.value.generatedAt) : null));

useHead({ title: "Server" });
</script>

<template>
	<UContainer class="max-w-5xl py-8">
		<header class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-highlighted text-lg font-semibold">Server</h1>
				<p class="text-muted text-sm">
					<template v-if="refreshedAt">Last refreshed at {{ refreshedAt }}</template>
					<template v-else-if="pending">Loading…</template>
					<template v-else>Not loaded</template>
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

		<div class="grid gap-4 md:grid-cols-2">
			<DashboardCard title="Server" :section="data?.server" :loading="pending">
				<div v-if="data?.server.ok" class="divide-default divide-y">
					<StatRow label="CPU" :value="`${data.server.data.cpu.usagePercent}%`" :hint="`load ${data.server.data.cpu.load[0]}`" />
					<StatRow label="RAM" :value="formatBytesPair(data.server.data.memory.usedBytes, data.server.data.memory.totalBytes)" :hint="`${data.server.data.memory.usagePercent}%`" />
					<StatRow label="Disk" :value="formatBytesPair(data.server.data.disk.usedBytes, data.server.data.disk.totalBytes)" :hint="`${data.server.data.disk.usagePercent}%`" />
					<StatRow label="Uptime" :value="formatUptime(data.server.data.uptimeSeconds)" />
				</div>
			</DashboardCard>

			<DashboardCard title="Services" :section="data?.services" :loading="pending">
				<div v-if="data?.services.ok" class="divide-default divide-y">
					<p v-if="!data.services.data.length" class="text-muted py-1 text-sm">No services configured.</p>
					<div v-for="service in data.services.data" :key="service.name" class="flex items-center justify-between gap-4 py-1.5">
						<span class="text-highlighted min-w-0 truncate text-sm">{{ service.name }}</span>
						<UTooltip :text="service.detail" :disabled="!service.detail">
							<span class="flex shrink-0 items-center gap-2">
								<span v-if="service.replicas" class="text-dimmed font-mono text-xs tabular-nums">{{ service.replicas.running }}/{{ service.replicas.desired }}</span>
								<StatusDot :state="service.state" />
							</span>
						</UTooltip>
					</div>
				</div>
			</DashboardCard>

			<DashboardCard title="Deployments" :section="data?.deployments" :loading="pending">
				<div v-if="data?.deployments.ok" class="divide-default divide-y">
					<p v-if="!data.deployments.data.length" class="text-muted py-1 text-sm">No deployments configured.</p>
					<div v-for="deployment in data.deployments.data" :key="deployment.name" class="flex items-baseline justify-between gap-4 py-1.5">
						<span class="text-muted shrink-0 text-sm">{{ deployment.name }}</span>
						<span v-if="deployment.image" class="min-w-0 truncate text-right font-mono text-xs" :title="deployment.image">
							<span class="text-dimmed">{{ splitImage(deployment.image).repository }}:</span>
							<span class="text-highlighted">{{ splitImage(deployment.image).tag }}</span>
						</span>
						<span v-else class="text-dimmed text-sm">not deployed</span>
					</div>
				</div>
			</DashboardCard>

			<DashboardCard title="Backups" :section="data?.backup" :loading="pending">
				<div v-if="data?.backup.ok" class="space-y-1">
					<div class="flex items-center justify-between gap-4">
						<span class="text-muted text-sm">Latest PostgreSQL backup</span>
						<StatusDot :state="data.backup.data.state" :label="BACKUP_LABELS[data.backup.data.state]" />
					</div>
					<p class="text-highlighted text-sm font-medium">
						{{ data.backup.data.latestAt ? formatMoment(data.backup.data.latestAt) : "None found" }}
					</p>
					<p class="text-dimmed text-xs">{{ data.backup.data.detail }}</p>
				</div>
			</DashboardCard>

			<DashboardCard v-if="data?.shortcuts.length" title="Shortcuts" class="md:col-span-2">
				<div class="flex flex-wrap gap-2">
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
					/>
				</div>
			</DashboardCard>
		</div>
	</UContainer>
</template>
