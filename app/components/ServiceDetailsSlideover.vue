<script setup lang="ts">
import type { ServiceStatus } from "#shared/types/dashboard";

const props = defineProps<{ service: ServiceStatus | null }>();
const emit = defineEmits<{ close: [] }>();
const open = computed({ get: () => props.service !== null, set: (value) => !value && emit("close") });
</script>

<template>
	<USlideover v-model:open="open" :title="service?.name" description="Current Docker Swarm service and task details">
		<template #body
			><div v-if="service" class="space-y-5">
				<div class="flex items-center justify-between"><span class="text-muted text-sm">Status</span><StatusDot :state="service.state" /></div>
				<div class="divide-default divide-y">
					<StatRow label="Replicas" :value="service.replicas ? `${service.replicas.running} running / ${service.replicas.desired} desired` : 'Unavailable'" /><StatRow
						label="Task state"
						:value="service.taskState || 'Unavailable'"
					/><StatRow label="Last restart" :value="service.lastRestartAt ? formatMoment(service.lastRestartAt) : 'No restart observed'" /><StatRow
						label="Created"
						:value="service.createdAt ? formatMoment(service.createdAt) : 'Unavailable'"
					/><StatRow label="Updated" :value="service.updatedAt ? formatMoment(service.updatedAt) : 'Unavailable'" />
				</div>
				<div>
					<p class="text-muted mb-1 text-xs font-medium tracking-wide uppercase">Image</p>
					<p class="text-highlighted font-mono text-xs break-all">{{ service.image || "Unavailable" }}</p>
				</div>
				<div>
					<p class="text-muted mb-1 text-xs font-medium tracking-wide uppercase">Task / container ID</p>
					<p class="text-highlighted font-mono text-xs break-all">{{ service.taskId || "Unavailable" }}</p>
				</div>
				<div v-if="service.failureReason" class="border-error/30 bg-error/5 rounded-md border p-3">
					<p class="text-error text-xs font-medium tracking-wide uppercase">Recent failure</p>
					<p class="text-muted mt-1 text-sm wrap-break-word">{{ service.failureReason }}</p>
				</div>
			</div></template
		>
	</USlideover>
</template>
