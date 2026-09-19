<script setup lang="ts">
import type { BackupStatus, Section } from "#shared/types/dashboard";

defineProps<{ backup: Section<BackupStatus>; diagnosticsEnabled: boolean }>();
</script>

<template>
	<OpsPanel title="Recovery reference">
		<div class="space-y-4 px-4 py-4">
			<div>
				<h3 class="label">Database restore</h3>
				<ol class="text-ink-2 mt-2 list-inside list-decimal space-y-1 text-sm">
					<li>Locate the verified dump in R2 using the existing backup rclone configuration.</li>
					<li>Restore into a separate database first. Do not overwrite production during investigation.</li>
					<li>Check the restored data and plan the production cutover in Dokploy.</li>
				</ol>
				<p v-if="backup.ok && backup.data.filename" class="readout text-ink-3 mt-2 text-xs">Latest recorded dump: {{ backup.data.filename }}</p>
			</div>
			<a v-if="diagnosticsEnabled" href="/api/diagnostics/snapshot" download class="text-ink-2 inline-flex items-center gap-2 text-sm underline underline-offset-2"
				><UIcon name="i-lucide-download" class="size-4" />Download diagnostic snapshot</a
			>
			<p v-else class="text-ink-3 text-xs">Log viewing and snapshots require opt-in diagnostics with verified Access JWTs.</p>
		</div>
	</OpsPanel>
</template>
