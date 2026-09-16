<script setup lang="ts">
const { hostname, generatedAt, staleSeconds, pending, live } = defineProps<{
	hostname: string | null;
	generatedAt: string | null;
	staleSeconds: number | null;
	pending: boolean;
	live: boolean;
}>();

const emit = defineEmits<{ refresh: []; "update:live": [value: boolean] }>();
</script>

<template>
	<header class="bg-ground border-line sticky top-0 z-20 border-b">
		<div class="mx-auto flex h-12 max-w-[88rem] items-center gap-4 px-4 sm:px-6">
			<span class="flex items-center gap-2.5">
				<svg viewBox="0 0 16 16" class="text-ink size-4" aria-hidden="true">
					<path d="M1 1h14v14H1Zm3 3v8h8V8H8V4Z" fill="currentColor" />
				</svg>
				<span class="text-ink text-sm font-semibold tracking-tight">abdspace</span>
				<span class="label hidden sm:inline">ops</span>
			</span>

			<span v-if="hostname" class="readout text-ink-3 border-line hidden border-l pl-4 text-xs sm:inline">{{ hostname }}</span>

			<div class="ml-auto flex items-center gap-1.5 sm:gap-3">
				<span v-if="generatedAt" class="readout text-ink-3 text-xs">
					{{ formatClock(generatedAt) }}
					<span v-if="staleSeconds !== null && staleSeconds > 20" class="text-idle hidden sm:inline">· {{ formatDurationShort(staleSeconds) }} old</span>
				</span>

				<button
					type="button"
					class="border-line hover:border-line-strong flex h-8 items-center gap-2 border px-2.5 transition-colors"
					:class="live ? 'text-ok border-ok/40' : 'text-ink-3'"
					:aria-pressed="live"
					title="Poll every 15 seconds (L)"
					@click="emit('update:live', !live)"
				>
					<span class="relative flex size-1.5">
						<span v-if="live" class="beacon absolute inset-0 rounded-full" />
						<span class="relative size-1.5 rounded-full" :class="live ? 'bg-ok' : 'bg-line-strong'" />
					</span>
					<span class="label" :class="live ? 'text-ok' : ''">Live</span>
				</button>

				<button
					type="button"
					class="border-line hover:border-line-strong hover:bg-raised text-ink flex h-8 items-center gap-2 border px-2.5 transition-colors disabled:opacity-60"
					:disabled="pending"
					title="Refresh (R)"
					@click="emit('refresh')"
				>
					<UIcon name="i-lucide-refresh-cw" class="size-3.5" :class="pending ? 'animate-spin' : ''" />
					<span class="label text-ink-2">Refresh</span>
					<kbd class="readout border-line text-ink-3 ml-0.5 hidden border px-1 text-[0.625rem] leading-4 sm:inline">R</kbd>
				</button>
			</div>
		</div>
		<span v-if="pending" class="tick-scan" aria-hidden="true" />
	</header>
</template>
