<script setup lang="ts">
import type { ServiceStatus } from "#shared/types/dashboard";

const props = defineProps<{ service: ServiceStatus | null }>();
const emit = defineEmits<{ close: [] }>();
const open = computed({ get: () => props.service !== null, set: (value) => !value && emit("close") });
</script>

<template>
	<USlideover v-model:open="open" :title="service?.name" description="Swarm service and current task">
		<template #body>
			<div v-if="service" class="space-y-6">
				<div class="border-line flex items-center justify-between gap-3 border-b pb-4">
					<StatePip :state="service.state" :label="true" :size="10" />
					<span class="readout text-ink-3 text-xs">{{ service.detail }}</span>
				</div>

				<dl class="divide-line divide-y">
					<StatRow label="Replicas" :value="service.replicas ? `${service.replicas.running} running of ${service.replicas.desired} desired` : 'unavailable'" />
					<StatRow label="Task state" :value="service.taskState || 'unavailable'" />
					<StatRow label="Task status at" :value="service.taskStatusAt ? formatMoment(service.taskStatusAt) : 'unavailable'" />
					<StatRow label="Created" :value="service.createdAt ? formatMoment(service.createdAt) : 'unavailable'" />
					<StatRow label="Updated" :value="service.updatedAt ? formatMoment(service.updatedAt) : 'unavailable'" />
				</dl>

				<CopyField v-if="service.image" label="Image" :value="service.image">
					<span class="text-ink-3">{{ splitImageRef(service.image).repository }}:</span><span class="text-ink">{{ splitImageRef(service.image).tag }}</span>
					<span v-if="splitImageRef(service.image).digest" class="text-ink-3 block">@{{ shortId(splitImageRef(service.image).digest!) }}</span>
				</CopyField>
				<div v-else>
					<p class="label">Image</p>
					<p class="readout text-ink-3 mt-2 text-xs">unavailable</p>
				</div>

				<CopyField v-if="service.taskId" label="Task / container" :value="service.taskId" />
				<div v-else>
					<p class="label">Task / container</p>
					<p class="readout text-ink-3 mt-2 text-xs">unavailable</p>
				</div>

				<div v-if="service.failureReason" class="border-crit/40 bg-crit/[0.06] border p-3">
					<p class="label text-crit">Recent failure</p>
					<p class="text-ink-2 mt-2 text-sm wrap-break-word">{{ service.failureReason }}</p>
				</div>
			</div>
		</template>
	</USlideover>
</template>
