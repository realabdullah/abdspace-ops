<script setup lang="ts">
import type { Section } from "#shared/types/dashboard";

const { title, section = undefined, loading = false, rows = 3 } = defineProps<{ title: string; section?: Section<unknown>; loading?: boolean; rows?: number }>();

const hint = computed(() => (section && !section.ok ? hintFor(section.error) : null));
</script>

<template>
	<section class="panel flex min-w-0 flex-col">
		<header class="panel-head">
			<h2 class="label text-ink-2">{{ title }}</h2>
			<slot name="aside" />
		</header>

		<div class="min-w-0 flex-1">
			<div v-if="loading && !section" class="space-y-3 px-4 py-4" aria-busy="true" aria-label="Loading">
				<div v-for="row in rows" :key="row" class="bg-raised h-4 animate-pulse" :style="{ width: `${92 - row * 13}%`, animationDelay: `${row * 90}ms` }" />
			</div>

			<div v-else-if="section && !section.ok" class="px-4 py-4">
				<p class="text-warn label">Unavailable</p>
				<p class="text-ink-2 mt-2 text-sm">{{ section.error }}</p>
				<p v-if="hint" class="text-ink-3 mt-1 text-xs">{{ hint }}</p>
			</div>

			<slot v-else />
		</div>
	</section>
</template>
