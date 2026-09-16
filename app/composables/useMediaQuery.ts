export function useMediaQuery(query: string): Ref<boolean> {
	const matches = ref(false);
	if (import.meta.client) {
		const list = window.matchMedia(query);
		const update = () => (matches.value = list.matches);
		update();
		list.addEventListener("change", update);
		onBeforeUnmount(() => list.removeEventListener("change", update));
	}
	return matches;
}
