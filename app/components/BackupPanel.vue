<script setup lang="ts">
import type { BackupStatus, Section } from "#shared/types/dashboard";

const { section = undefined, loading = false } = defineProps<{ section?: Section<BackupStatus>; loading?: boolean }>();

const backup = computed(() => (section?.ok ? section.data : null));

/** The freshness track runs to 1.5x the schedule so a late backup still has somewhere to sit. */
const freshness = computed(() => {
	const data = backup.value;
	if (!data || data.ageSeconds === null) return null;
	const scheduleHours = data.maxAgeHours;
	const scaleHours = scheduleHours * 1.5;
	const ageHours = data.ageSeconds / 3600;
	return {
		scheduleHours,
		ageHours,
		markerPercent: Math.min(100, (ageHours / scaleHours) * 100),
		schedulePercent: (scheduleHours / scaleHours) * 100,
		scaleHours,
	};
});
</script>

<template>
	<OpsPanel title="PostgreSQL backup" :section="section" :loading="loading">
		<template #aside>
			<StatePip v-if="backup" :state="backup.state" :label="backup.detail" />
		</template>

		<div v-if="backup" class="px-4 py-4">
			<p class="flex items-baseline justify-between gap-3">
				<span class="readout text-ink text-2xl leading-none font-medium" :class="TONE_TEXT[TONE[backup.state]]">{{
					backup.ageSeconds !== null ? formatDurationShort(backup.ageSeconds) : "none"
				}}</span>
				<span class="label">since last dump</span>
			</p>

			<div v-if="freshness" class="mt-4">
				<div class="bg-raised relative h-2 w-full overflow-hidden">
					<div class="h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" :class="TONE_FILL[TONE[backup.state]]" :style="{ width: `${freshness.markerPercent}%` }" />
					<span class="bg-line-strong absolute inset-y-0 w-px" :style="{ left: `${freshness.schedulePercent}%` }" />
				</div>
				<div class="mt-1.5 flex justify-between">
					<span class="label normal-case">0h</span>
					<span class="label normal-case">schedule {{ freshness.scheduleHours }}h</span>
				</div>
			</div>

			<dl class="divide-line border-line mt-4 divide-y border-t">
				<StatRow label="Completed" :value="backup.latestAt ? formatMoment(backup.latestAt) : 'No successful backup in log'" />
				<StatRow label="File" :value="backup.filename || 'unavailable'" />
				<StatRow label="Size" :value="backup.sizeBytes !== null ? formatBytes(backup.sizeBytes) : 'unavailable'" />
				<StatRow label="Retention" :value="`${backup.retentionDays} days remote`" />
			</dl>

			<div v-if="backup.lastFailure" class="border-crit/40 bg-crit/[0.06] mt-4 border p-3">
				<p class="label text-crit">Last failure{{ backup.lastFailure.at ? ` · ${formatMoment(backup.lastFailure.at)}` : "" }}</p>
				<p class="text-ink-2 mt-2 text-xs wrap-break-word">{{ backup.lastFailure.detail }}</p>
			</div>
		</div>
	</OpsPanel>
</template>
