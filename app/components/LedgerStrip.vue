<script setup lang="ts">
import type { Tone } from "~/utils/state";

export interface LedgerCell {
	label: string;
	value: string;
	sub: string;
	tone?: Tone;
}

defineProps<{ cells: LedgerCell[] }>();
</script>

<template>
	<dl class="divide-line border-line grid grid-cols-2 divide-x divide-y border-b sm:grid-cols-4 sm:divide-y-0 sm:border-b-0">
		<div v-for="cell in cells" :key="cell.label" class="min-w-0 px-4 py-3.5">
			<dt class="label">{{ cell.label }}</dt>
			<dd class="readout mt-2 truncate text-lg leading-none font-medium" :class="cell.tone ? TONE_TEXT[cell.tone] : 'text-ink'">{{ cell.value }}</dd>
			<dd class="text-ink-3 mt-1.5 truncate text-xs">{{ cell.sub }}</dd>
		</div>
	</dl>
</template>
