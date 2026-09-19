<script setup lang="ts">
import type { ServiceLogs, ServiceStatus } from "#shared/types/dashboard";

const props = defineProps<{ service: ServiceStatus | null; diagnosticsEnabled: boolean }>();
const emit = defineEmits<{ close: [] }>();
const open = computed({ get: () => props.service !== null, set: (value) => !value && emit("close") });
const logs = ref<ServiceLogs | null>(null);
const logsError = ref<string | null>(null);
const loadingLogs = ref(false);

watch(
	() => props.service?.id,
	() => {
		logs.value = null;
		logsError.value = null;
	}
);

const loadLogs = async () => {
	if (!props.service || !props.diagnosticsEnabled) return;
	loadingLogs.value = true;
	logsError.value = null;
	try {
		logs.value = await $fetch<ServiceLogs>("/api/diagnostics/logs", { query: { service: props.service.name }, cache: "no-store" });
	} catch {
		logsError.value = "Logs are unavailable. Check the service logging driver and Docker proxy access.";
	} finally {
		loadingLogs.value = false;
	}
};
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
					<CopyField v-if="service.failureTaskId" class="mt-3" label="Failing task ID" :value="service.failureTaskId" />
				</div>
				<div v-if="service.id && service.replicas" class="border-line space-y-4 border-t pt-4">
					<p class="label">Investigate</p>
					<CopyField label="List tasks" :value="`docker service ps --no-trunc ${service.id}`" />
					<CopyField label="Inspect service" :value="`docker service inspect ${service.id}`" />
					<CopyField label="Read logs on the VPS" :value="`docker service logs --tail 100 ${service.id}`" />
					<a
						v-if="service.dokployUrl"
						:href="service.dokployUrl"
						target="_blank"
						rel="noopener noreferrer"
						class="text-ink-2 inline-flex items-center gap-1 text-sm underline underline-offset-2"
						>Open in Dokploy <UIcon name="i-lucide-arrow-up-right" class="size-3.5"
					/></a>
				</div>
				<div v-if="diagnosticsEnabled && service.id && service.replicas" class="border-line space-y-3 border-t pt-4">
					<UButton label="View recent logs" icon="i-lucide-scroll-text" color="neutral" variant="outline" size="sm" :loading="loadingLogs" @click="loadLogs" />
					<p v-if="logsError" class="text-warn text-xs">{{ logsError }}</p>
					<div v-if="logs">
						<p class="label">Last 100 lines{{ logs.truncated ? " · truncated" : "" }}</p>
						<pre class="bg-raised text-ink-2 mt-2 max-h-80 overflow-auto p-3 font-mono text-xs wrap-break-word whitespace-pre-wrap">{{ logs.lines || "No logs returned." }}</pre>
					</div>
				</div>
			</div>
		</template>
	</USlideover>
</template>
