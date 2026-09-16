<script setup lang="ts">
import type { ActivityEvent } from "#shared/types/dashboard";

const { events } = defineProps<{ events: ActivityEvent[] }>();

const KIND: Record<ActivityEvent["kind"], string> = {
	service: "svc",
	deployment: "dep",
	backup: "bkp",
	external: "chk",
};

const VISIBLE = 10;
const expanded = ref(false);

const shown = computed(() => (expanded.value ? events : events.slice(0, VISIBLE)));
const hidden = computed(() => events.length - shown.value.length);

/** Activity details are often image references; the digest drowns the tag. */
const detailOf = (event: ActivityEvent) => {
	if (!event.detail) return null;
	if (!/^[a-z0-9.\-/]+:[^\s]+$/i.test(event.detail)) return event.detail;
	const { repository, tag } = splitImageRef(event.detail);
	return `${repository}:${tag}`;
};

const groups = computed(() => {
	const buckets = new Map<string, ActivityEvent[]>();
	for (const event of shown.value) {
		const day = dayLabel(event.at);
		buckets.set(day, [...(buckets.get(day) ?? []), event]);
	}
	return [...buckets].map(([day, items]) => ({ day, items }));
});
</script>

<template>
	<OpsPanel title="Recent activity">
		<template #aside>
			<span class="readout text-ink-3 text-xs">{{ events.length }} events</span>
		</template>

		<div v-for="group in groups" :key="group.day">
			<p class="label border-line bg-raised/40 border-b px-4 py-2">{{ group.day }}</p>
			<ol class="divide-line divide-y">
				<li v-for="event in group.items" :key="event.id" class="grid grid-cols-[3.25rem_0.75rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-2.5">
					<time :datetime="event.at" class="readout text-ink-3 text-xs">{{ formatClock(event.at) }}</time>
					<StatePip :state="event.state" :size="7" class="translate-y-px" />
					<span class="min-w-0">
						<span class="text-ink block text-sm">{{ event.title }}</span>
						<span v-if="detailOf(event)" class="readout text-ink-3 block truncate text-xs" :title="event.detail!">{{ detailOf(event) }}</span>
					</span>
					<span class="label hidden sm:block">{{ KIND[event.kind] }}</span>
				</li>
			</ol>
		</div>
		<button v-if="hidden || expanded" type="button" class="hover:bg-raised/60 border-line label w-full border-t px-4 py-2.5 text-left transition-colors" @click="expanded = !expanded">
			{{ expanded ? "Show fewer" : `${hidden} older events` }}
		</button>
	</OpsPanel>
</template>
