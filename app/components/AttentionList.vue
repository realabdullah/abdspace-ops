<script setup lang="ts">
import type { AttentionItem } from "#shared/types/dashboard";

const { items } = defineProps<{ items: AttentionItem[] }>();
const emit = defineEmits<{ inspect: [name: string] }>();

const ordered = computed(() => [...items].sort((a, b) => Number(b.severity === "critical") - Number(a.severity === "critical")));
const serviceName = (id: string) => (id.startsWith("service-") ? id.slice("service-".length) : null);
</script>

<template>
	<section class="panel" aria-label="Needs attention">
		<header class="panel-head">
			<h2 class="label text-ink-2">Needs attention</h2>
			<span class="readout text-ink-3 text-xs">{{ ordered.length }}</span>
		</header>
		<ul class="divide-line divide-y">
			<li v-for="item in ordered" :key="item.id">
				<component
					:is="serviceName(item.id) ? 'button' : 'div'"
					:type="serviceName(item.id) ? 'button' : undefined"
					class="flex w-full items-start gap-3 px-4 py-3 text-left"
					:class="serviceName(item.id) ? 'hover:bg-raised/60 transition-colors' : ''"
					@click="serviceName(item.id) && emit('inspect', serviceName(item.id)!)"
				>
					<span class="mt-0.5 shrink-0" :class="item.severity === 'critical' ? 'text-crit' : 'text-warn'">
						<svg width="10" height="10" viewBox="0 0 8 8" aria-hidden="true">
							<rect v-if="item.severity === 'critical'" x="0.7" y="0.7" width="6.6" height="6.6" rx="1" fill="currentColor" />
							<path v-else d="M4 0.5 7.7 7.2H0.3Z" fill="currentColor" />
						</svg>
					</span>
					<span class="min-w-0 flex-1">
						<span class="text-ink block text-sm font-medium">{{ item.title }}</span>
						<span class="text-ink-3 mt-0.5 block text-xs wrap-break-word">{{ item.detail }}</span>
					</span>
					<span v-if="serviceName(item.id)" class="label mt-0.5 flex shrink-0 items-center gap-1 self-center">
						<span class="hidden sm:inline">Inspect</span><UIcon name="i-lucide-chevron-right" class="size-3.5" />
					</span>
				</component>
			</li>
		</ul>
	</section>
</template>
