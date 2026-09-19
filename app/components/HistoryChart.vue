<script setup lang="ts">
import type { HistoryPoint } from "#shared/types/dashboard";

const props = defineProps<{ label: string; period: string; points: HistoryPoint[] }>();

const chart = computed(() => {
	const points = props.points.filter((point) => Number.isFinite(Date.parse(point.at)) && Number.isFinite(point.value));
	if (points.length < 2) return null;
	const first = Date.parse(points[0]!.at);
	const last = Date.parse(points.at(-1)!.at);
	if (last <= first) return null;
	const coordinates = points.map((point) => {
		const x = ((Date.parse(point.at) - first) / (last - first)) * 100;
		const y = 100 - Math.min(100, Math.max(0, point.value));
		return `${x.toFixed(2)},${y.toFixed(2)}`;
	});
	return {
		line: coordinates.join(" "),
		latest: points.at(-1)!.value,
		min: Math.min(...points.map((point) => point.value)),
		max: Math.max(...points.map((point) => point.value)),
		count: points.length,
	};
});
</script>

<template>
	<div class="min-w-0 px-4 py-4">
		<div class="flex items-baseline justify-between gap-3">
			<h3 class="label">{{ label }} · {{ period }}</h3>
			<span v-if="chart" class="readout text-ink text-sm">{{ chart.latest }}%</span>
		</div>
		<svg v-if="chart" viewBox="0 0 100 100" preserveAspectRatio="none" class="mt-4 h-20 w-full" aria-hidden="true">
			<line x1="0" y1="25" x2="100" y2="25" class="stroke-line" stroke-width="0.5" vector-effect="non-scaling-stroke" />
			<line x1="0" y1="50" x2="100" y2="50" class="stroke-line" stroke-width="0.5" vector-effect="non-scaling-stroke" />
			<line x1="0" y1="75" x2="100" y2="75" class="stroke-line" stroke-width="0.5" vector-effect="non-scaling-stroke" />
			<polyline :points="chart.line" fill="none" class="stroke-ink" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
		</svg>
		<p v-if="chart" class="readout text-ink-3 mt-2 text-xs">{{ chart.count }} readings · low {{ chart.min }}% · high {{ chart.max }}%</p>
		<p v-else class="text-ink-3 mt-4 text-xs">Collecting readings. A trend appears after two samples.</p>
	</div>
</template>
