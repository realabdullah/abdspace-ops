<script setup lang="ts">
const { image, digest = false } = defineProps<{ image: string; digest?: boolean }>();

const compact = useMediaQuery("(max-width: 639px)");
const parts = computed(() => splitImageRef(image));

/** On a phone the registry path eats the tag, which is the part being read. */
const repository = computed(() => (compact.value ? (parts.value.repository.split("/").at(-1) ?? parts.value.repository) : parts.value.repository));
</script>

<template>
	<span class="readout block min-w-0 truncate text-xs" :title="image">
		<span class="text-ink-3">{{ repository }}:</span><span class="text-ink-2">{{ parts.tag }}</span>
		<span v-if="digest && parts.digest" class="text-ink-3 hidden sm:inline"> · {{ shortId(parts.digest) }}</span>
	</span>
</template>
