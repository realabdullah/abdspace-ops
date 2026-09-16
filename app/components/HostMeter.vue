<script setup lang="ts">
const {
	label,
	value,
	primary,
	secondary = undefined,
	warning,
	critical,
	history = [],
} = defineProps<{
	label: string;
	value: number;
	primary: string;
	secondary?: string;
	warning: number;
	critical: number;
	history?: number[];
}>();

const tone = computed(() => usageTone(value, warning, critical));

const change = computed(() => {
	const [previous, latest] = history.slice(-2);
	if (previous === undefined || latest === undefined) return null;
	const delta = latest - previous;
	if (Math.abs(delta) < 0.1) return "no change";
	return `${delta > 0 ? "+" : "\u2212"}${Math.abs(delta).toFixed(1)} since last reading`;
});
const zones = computed(() => ({
	"--warn": `${warning}%`,
	"--crit": `${critical}%`,
}));
</script>

<template>
	<div class="flex min-w-0 flex-col gap-3 px-4 py-4">
		<div class="flex items-baseline justify-between gap-3">
			<span class="label">{{ label }}</span>
			<span class="flex items-baseline gap-2">
				<span v-if="change" class="label normal-case">{{ change }}</span>
				<span class="readout text-ink text-xl leading-none font-medium tracking-tight" :class="TONE_TEXT[tone]">{{ primary }}</span>
			</span>
		</div>

		<MetricSparkline v-if="history.length > 1" :values="history" :tone="tone" />

		<div
			class="relative h-2 w-full overflow-hidden"
			:style="zones"
			style="
				background: linear-gradient(
					90deg,
					var(--color-raised) 0 var(--warn),
					color-mix(in oklch, var(--color-warn) 18%, var(--color-raised)) var(--warn) var(--crit),
					color-mix(in oklch, var(--color-crit) 20%, var(--color-raised)) var(--crit) 100%
				);
			"
			role="meter"
			:aria-label="`${label} usage`"
			:aria-valuenow="value"
			aria-valuemin="0"
			aria-valuemax="100"
			:aria-valuetext="primary"
		>
			<div class="h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" :class="TONE_FILL[tone]" :style="{ width: `${Math.min(100, Math.max(0, value))}%` }" />
			<span class="bg-line-strong absolute inset-y-0 w-px" :style="{ left: `${warning}%` }" />
			<span class="bg-line-strong absolute inset-y-0 w-px" :style="{ left: `${critical}%` }" />
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="label self-end normal-case">warn {{ warning }} · crit {{ critical }}</span>
			<span v-if="secondary" class="readout text-ink-3 text-xs">{{ secondary }}</span>
		</div>
	</div>
</template>
