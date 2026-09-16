<script setup lang="ts">
import type { Section, ServiceStatus } from "#shared/types/dashboard";

const { section = undefined, loading = false } = defineProps<{ section?: Section<ServiceStatus[]>; loading?: boolean }>();
const emit = defineEmits<{ inspect: [service: ServiceStatus] }>();

const services = computed(() => (section?.ok ? byState(section.data) : []));
const online = computed(() => services.value.filter((service) => service.state === "online").length);
</script>

<template>
	<OpsPanel title="Swarm services" :section="section" :loading="loading" :rows="5">
		<template #aside>
			<span v-if="section?.ok" class="readout text-ink-3 text-xs"> {{ online }}/{{ services.length }} online </span>
		</template>

		<p v-if="section?.ok && !services.length" class="text-ink-3 px-4 py-4 text-sm">
			No services configured. Set <span class="readout text-ink-2">DASHBOARD_SERVICES</span> to watch Swarm services.
		</p>

		<ul v-else class="divide-line divide-y">
			<li v-for="service in services" :key="service.name">
				<button
					type="button"
					class="hover:bg-raised/60 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_1rem]"
					@click="emit('inspect', service)"
				>
					<span class="col-start-1 row-start-1 min-w-0">
						<span class="text-ink block truncate text-sm font-medium">{{ service.name }}</span>
						<ImageRef v-if="service.image" :image="service.image" class="mt-1" />
						<span v-else class="readout text-ink-3 mt-1 block text-xs">image unavailable</span>
					</span>

					<span class="readout col-start-1 row-start-2 flex items-center gap-2 text-xs sm:col-start-2 sm:row-start-1">
						<span v-if="service.replicas && service.replicas.desired <= 6" class="flex gap-0.5" aria-hidden="true">
							<span
								v-for="slot in service.replicas.desired"
								:key="slot"
								class="h-3 w-1"
								:class="slot <= service.replicas.running ? TONE_FILL[TONE[service.state]] : 'bg-raised border-line-strong border'"
							/>
						</span>
						<span class="text-ink-3">{{ service.replicas ? `${service.replicas.running}/${service.replicas.desired}` : "—" }}</span>
					</span>

					<StatePip class="col-start-2 row-start-1 justify-self-end sm:col-start-3 sm:justify-self-start" :state="service.state" :label="true" />
					<UIcon name="i-lucide-chevron-right" class="text-ink-3 col-start-2 row-start-2 hidden size-4 justify-self-end sm:col-start-4 sm:row-start-1 sm:block" />
				</button>
			</li>
		</ul>
	</OpsPanel>
</template>
