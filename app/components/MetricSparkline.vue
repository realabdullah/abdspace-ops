<script setup lang="ts">
import type { Tone } from "~/utils/state";

const { values, tone } = defineProps<{ values: number[]; tone: Tone }>();

const STROKE: Record<Tone, string> = { ok: "stroke-ok", warn: "stroke-warn", crit: "stroke-crit", idle: "stroke-idle" };
const FILL: Record<Tone, string> = { ok: "fill-ok", warn: "fill-warn", crit: "fill-crit", idle: "fill-idle" };

const geometry = computed(() => {
	const points = values.slice(-40);
	if (points.length < 2) return null;
	/** The trace shares the meter's 0-100 domain, so height means the same thing in every cell. */
	const step = 100 / (points.length - 1);
	const coordinates = points.map((value, index) => [index * step, 100 - Math.min(100, Math.max(0, value))] as const);
	return {
		line: coordinates.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
		area: `0,100 ${coordinates.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} 100,100`,
	};
});
</script>

<template>
	<svg v-if="geometry" viewBox="0 0 100 100" preserveAspectRatio="none" class="h-7 w-full" aria-hidden="true">
		<polygon :points="geometry.area" :class="FILL[tone]" opacity="0.09" />
		<polyline :points="geometry.line" fill="none" :class="STROKE[tone]" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
	</svg>
</template>
