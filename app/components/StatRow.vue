<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string | null }>();
</script>

<template>
	<div class="flex items-baseline justify-between gap-4 py-1 text-sm">
		<span class="text-muted shrink-0">{{ label }}</span>
		<span class="text-highlighted min-w-0 truncate text-right font-medium tabular-nums">
			{{ value }}
			<span v-if="hint" class="text-dimmed ml-1 font-normal">{{ hint }}</span>
		</span>
	</div>
</template>
