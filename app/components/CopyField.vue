<script setup lang="ts">
const { label, value, display = undefined } = defineProps<{ label: string; value: string; display?: string }>();

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const copy = async () => {
	try {
		await navigator.clipboard.writeText(value);
		copied.value = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => (copied.value = false), 1400);
	} catch {
		copied.value = false;
	}
};

onBeforeUnmount(() => timer && clearTimeout(timer));
</script>

<template>
	<div>
		<div class="flex items-center justify-between gap-3">
			<p class="label">{{ label }}</p>
			<button type="button" class="label hover:text-ink-2 flex items-center gap-1 transition-colors" :aria-label="`Copy ${label}`" @click="copy">
				<UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3" :class="copied ? 'text-ok' : ''" />
				{{ copied ? "Copied" : "Copy" }}
			</button>
		</div>
		<p class="readout text-ink mt-2 text-xs break-all">
			<slot>{{ display ?? value }}</slot>
		</p>
	</div>
</template>
