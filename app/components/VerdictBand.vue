<script setup lang="ts">
import type { ServerStats, Section } from "#shared/types/dashboard";
import type { Verdict } from "~/composables/useOpsDashboard";

const { verdict, server } = defineProps<{ verdict: Verdict; server: Section<ServerStats> }>();

const SHAPE: Record<string, string> = {
	ok: "M14 4.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Z",
	warn: "M14 3.4 26 24.6H2Z",
	crit: "M4.2 4.2h19.6v19.6H4.2Z",
	idle: "M14 5.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z",
};
</script>

<template>
	<section
		class="border-line border-b"
		:class="{
			'border-crit/40 bg-crit/[0.09]': verdict.tone === 'crit',
			'border-warn/35 bg-warn/[0.07]': verdict.tone === 'warn',
		}"
	>
		<div class="mx-auto flex max-w-[88rem] flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:px-6 sm:py-8">
			<div class="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
				<span class="relative mt-1.5 flex size-8 shrink-0 items-center justify-center sm:mt-0" :class="TONE_TEXT[verdict.tone]">
					<span v-if="verdict.tone === 'crit'" class="beacon absolute inset-2 rounded-full" />
					<svg viewBox="0 0 28 28" class="relative size-8" aria-hidden="true"><path :d="SHAPE[verdict.tone]" fill="currentColor" /></svg>
				</span>

				<div class="min-w-0">
					<h1
						class="readout text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.06] font-semibold tracking-[-0.01em] text-pretty uppercase"
						:class="verdict.tone === 'ok' ? 'text-ink' : TONE_TEXT[verdict.tone]"
						aria-live="polite"
					>
						{{ verdict.headline }}
					</h1>
					<p class="text-ink-2 mt-3 text-sm text-pretty">{{ verdict.detail }}</p>
				</div>
			</div>

			<dl v-if="server.ok" class="border-line grid shrink-0 grid-cols-3 gap-x-6 gap-y-1 border-t pt-4 sm:gap-x-9 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-9">
				<dt class="label col-start-1 row-start-1">Uptime</dt>
				<dd class="readout text-ink col-start-1 row-start-2 text-sm">{{ formatUptimeDetail(server.data.uptimeSeconds) }}</dd>
				<dt class="label col-start-2 row-start-1">Load</dt>
				<dd class="readout text-ink col-start-2 row-start-2 text-sm">{{ server.data.cpu.load[0].toFixed(2) }}</dd>
				<dt class="label col-start-3 row-start-1">Cores</dt>
				<dd class="readout text-ink col-start-3 row-start-2 text-sm">{{ server.data.cpu.cores }}</dd>
			</dl>
		</div>
	</section>
</template>
