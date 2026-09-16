<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string | null }>();
</script>

<template>
	<div class="flex items-baseline justify-between gap-4 py-2">
		<dt class="label shrink-0">{{ label }}</dt>
		<dd class="readout text-ink-2 min-w-0 truncate text-right text-xs">
			{{ value }}
			<span v-if="hint" class="text-ink-3 ml-1.5">{{ hint }}</span>
		</dd>
	</div>
</template>
