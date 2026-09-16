<script setup lang="ts">
import type { HealthState } from "#shared/types/dashboard";

const { state, label = undefined, size = 8 } = defineProps<{ state: HealthState; label?: string | boolean; size?: number }>();

const tone = computed(() => TONE[state]);
const text = computed(() => (label === true ? STATE_LABEL[state] : typeof label === "string" ? label : null));
</script>

<template>
	<span class="inline-flex items-center gap-2" :class="TONE_TEXT[tone]">
		<svg :width="size" :height="size" viewBox="0 0 8 8" aria-hidden="true" class="shrink-0 overflow-visible">
			<circle v-if="state === 'online'" cx="4" cy="4" r="3.1" fill="currentColor" />
			<path v-else-if="state === 'degraded'" d="M4 0.5 7.7 7.2H0.3Z" fill="currentColor" />
			<rect v-else-if="state === 'offline'" x="0.7" y="0.7" width="6.6" height="6.6" rx="1" fill="currentColor" />
			<circle v-else cx="4" cy="4" r="2.7" fill="none" stroke="currentColor" stroke-width="1.3" />
		</svg>
		<span v-if="text" class="text-xs font-medium whitespace-nowrap">{{ text }}</span>
		<span v-else class="sr-only">{{ STATE_LABEL[state] }}</span>
	</span>
</template>
