<script setup lang="ts">
import type { HealthState } from "#shared/types/dashboard";

const { state, label = "" } = defineProps<{ state: HealthState; label?: string }>();

const LABELS: Record<HealthState, string> = {
	online: "Online",
	degraded: "Degraded",
	offline: "Offline",
	unknown: "Unknown",
};

const DOTS: Record<HealthState, string> = {
	online: "bg-emerald-500",
	degraded: "bg-amber-500",
	offline: "bg-red-500",
	unknown: "bg-zinc-400",
};

const TEXT: Record<HealthState, string> = {
	online: "text-emerald-600 dark:text-emerald-400",
	degraded: "text-amber-600 dark:text-amber-400",
	offline: "text-red-600 dark:text-red-400",
	unknown: "text-muted",
};
</script>

<template>
	<span class="inline-flex items-center gap-2 text-sm font-medium" :class="TEXT[state]">
		<span class="size-2 shrink-0 rounded-full" :class="DOTS[state]" />
		{{ label || LABELS[state] }}
	</span>
</template>
