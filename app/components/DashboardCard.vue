<script setup lang="ts">
import type { Section } from "#shared/types/dashboard";

defineProps<{
	title: string;
	section?: Section<unknown>;
	loading?: boolean;
}>();
</script>

<template>
	<section class="border-default bg-default rounded-lg border">
		<header class="border-default flex items-center justify-between border-b px-4 py-2.5">
			<h2 class="text-highlighted text-sm font-semibold">{{ title }}</h2>
			<slot name="header" />
		</header>

		<div class="px-4 py-3">
			<div v-if="loading && !section" class="space-y-2.5" aria-busy="true">
				<USkeleton v-for="row in 3" :key="row" class="h-5 w-full" />
			</div>

			<p v-else-if="section && !section.ok" class="text-muted flex items-start gap-2 py-1 text-sm">
				<UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0 text-amber-500" />
				<span>{{ section.error }}</span>
			</p>

			<slot v-else />
		</div>
	</section>
</template>
