<script setup lang="ts">
import type { ExternalCheck, Section } from "#shared/types/dashboard";

const { section = undefined, loading = false } = defineProps<{ section?: Section<ExternalCheck[]>; loading?: boolean }>();

const checks = computed(() => (section?.ok ? byState(section.data) : []));
const passing = computed(() => checks.value.filter((check) => check.state === "online").length);
</script>

<template>
	<OpsPanel title="Endpoint checks" :section="section" :loading="loading">
		<template #aside>
			<span v-if="section?.ok" class="readout text-ink-3 text-xs">{{ passing }}/{{ checks.length }} passing</span>
		</template>

		<ul class="divide-line divide-y">
			<li v-for="check in checks" :key="check.id" class="flex items-center justify-between gap-3 px-4 py-2.5">
				<span class="min-w-0">
					<span class="text-ink block truncate text-sm">{{ check.name }}</span>
					<span class="readout text-ink-3 block truncate text-xs">{{ check.detail || check.source }}</span>
				</span>
				<StatePip :state="check.state" :label="check.state === 'online' ? undefined : true" />
			</li>
		</ul>
	</OpsPanel>
</template>
