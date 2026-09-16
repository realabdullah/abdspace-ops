<script setup lang="ts">
import type { Deployment, Section } from "#shared/types/dashboard";

const { section = undefined, loading = false } = defineProps<{ section?: Section<Deployment[]>; loading?: boolean }>();

const deployments = computed(() => (section?.ok ? section.data : []));

/** The immutable tag already carries the commit, so repeating it is noise. */
const commit = (deployment: Deployment) => (deployment.commitSha && !deployment.immutableTag ? shortId(deployment.commitSha) : null);
const newest = computed(() =>
	deployments.value
		.map((deployment) => deployment.deployedAt)
		.filter((at): at is string => Boolean(at) && !Number.isNaN(Date.parse(at!)))
		.sort((a, b) => Date.parse(b) - Date.parse(a))
		.at(0)
);
</script>

<template>
	<OpsPanel title="Deployments" :section="section" :loading="loading" :rows="4">
		<template #aside>
			<span v-if="newest" class="readout text-ink-3 text-xs">last {{ formatMoment(newest) }}</span>
		</template>

		<p v-if="section?.ok && !deployments.length" class="text-ink-3 px-4 py-4 text-sm">
			No deployments configured. Set <span class="readout text-ink-2">DASHBOARD_DEPLOYMENTS</span> to track shipped images.
		</p>

		<ul v-else class="divide-line divide-y">
			<li v-for="deployment in deployments" :key="deployment.name" class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3">
				<span class="text-ink col-start-1 truncate text-sm font-medium">{{ deployment.name }}</span>
				<span v-if="deployment.deployedAt" class="readout text-ink-3 col-start-2 row-start-1 shrink-0 text-xs">{{ formatMoment(deployment.deployedAt) }}</span>

				<span v-if="deployment.image" class="col-start-1 col-end-3 min-w-0">
					<ImageRef :image="deployment.image" digest />
					<span v-if="commit(deployment)" class="readout text-ink-3 text-xs">commit {{ commit(deployment) }}</span>
				</span>
				<span v-else class="readout text-ink-3 col-start-1 col-end-3 text-xs">not deployed</span>
			</li>
		</ul>
	</OpsPanel>
</template>
