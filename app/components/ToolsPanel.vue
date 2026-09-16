<script setup lang="ts">
import type { Shortcut } from "#shared/types/dashboard";

defineProps<{ shortcuts: Shortcut[] }>();

const host = (url: string) => {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
};
</script>

<template>
	<OpsPanel title="Consoles">
		<ul class="divide-line divide-y">
			<li v-for="shortcut in shortcuts" :key="shortcut.url">
				<a :href="shortcut.url" target="_blank" rel="noopener noreferrer" class="hover:bg-raised/60 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors">
					<span class="min-w-0">
						<span class="text-ink block truncate text-sm">{{ shortcut.label }}</span>
						<span class="readout text-ink-3 block truncate text-xs">{{ host(shortcut.url) }}</span>
					</span>
					<UIcon name="i-lucide-arrow-up-right" class="text-ink-3 size-4 shrink-0" />
				</a>
			</li>
		</ul>
	</OpsPanel>
</template>
