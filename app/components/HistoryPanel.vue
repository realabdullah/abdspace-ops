<script setup lang="ts">
import type { HistoryPayload } from "#shared/types/dashboard";

defineProps<{ history: HistoryPayload | null }>();
</script>

<template>
	<OpsPanel title="History">
		<template #aside><span class="readout text-ink-3 text-xs">Stored on this VPS · 32-day retention</span></template>
		<p v-if="!history" class="text-ink-3 px-4 py-4 text-sm">Loading history…</p>
		<p v-else-if="!history.available" class="text-warn px-4 py-4 text-sm">{{ history.error || "History unavailable" }}. Live status is still available.</p>
		<template v-else>
			<div class="divide-line grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
				<HistoryChart label="CPU" period="6 hours" :points="history.cpu" />
				<HistoryChart label="RAM" period="24 hours" :points="history.memory" />
				<HistoryChart label="Disk" period="30 days" :points="history.disk" />
			</div>
			<div class="border-line grid border-t md:grid-cols-3 md:divide-x">
				<div class="px-4 py-4">
					<h3 class="label">Observed availability · 24 hours</h3>
					<p v-if="!history.availability.length" class="text-ink-3 mt-3 text-xs">No readings yet.</p>
					<ul v-else class="mt-3 space-y-2">
						<li v-for="item in history.availability" :key="item.name" class="flex justify-between gap-3 text-xs">
							<span class="text-ink-2 min-w-0 truncate" :title="item.name">{{ item.name }}</span
							><span class="readout text-ink shrink-0" :title="`${item.samples} observed readings`">{{ item.availablePercent }}%</span>
						</li>
					</ul>
				</div>
				<div class="border-line border-t px-4 py-4 md:border-t-0">
					<h3 class="label">Deployments · 30 days</h3>
					<p v-if="!history.deployments.length" class="text-ink-3 mt-3 text-xs">No deployment events observed.</p>
					<ul v-else class="mt-3 space-y-2">
						<li v-for="event in history.deployments.slice(0, 5)" :key="event.id" class="text-xs">
							<span class="text-ink-2">{{ event.title }}</span
							><span class="readout text-ink-3 ml-2">{{ formatMoment(event.at) }}</span>
						</li>
					</ul>
				</div>
				<div class="border-line border-t px-4 py-4 md:border-t-0">
					<h3 class="label">Backups · 30 days</h3>
					<p v-if="!history.backups.length" class="text-ink-3 mt-3 text-xs">No backup events observed.</p>
					<ul v-else class="mt-3 space-y-2">
						<li v-for="event in history.backups.slice(0, 5)" :key="event.id" class="text-xs">
							<span class="text-ink-2">{{ event.title }}</span
							><span class="readout text-ink-3 ml-2">{{ formatMoment(event.at) }}</span>
						</li>
					</ul>
				</div>
			</div>
			<p class="border-line text-ink-3 border-t px-4 py-2 text-xs">Availability counts only successful observations, not periods when monitoring was unavailable.</p>
		</template>
	</OpsPanel>
</template>
