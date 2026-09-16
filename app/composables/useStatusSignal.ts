import type { Verdict } from "./useOpsDashboard";

const MARK: Record<string, string> = {
	ok: "#3fd39a",
	warn: "#f5b73d",
	crit: "#f0604d",
	idle: "#9aa2ad",
};

function favicon(color: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#17181b"/><circle cx="16" cy="16" r="6" fill="${color}"/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The browser tab is the smallest instrument: colour and count read without opening it. */
export function useStatusSignal(verdict: Ref<Verdict | null>, failed: Ref<boolean>) {
	const title = computed(() => {
		if (failed.value) return "Unreachable · ops";
		const current = verdict.value;
		if (!current) return "ops";
		if (current.critical) return `${current.critical} critical · ops`;
		if (current.warnings) return `${current.warnings} ${current.warnings === 1 ? "warning" : "warnings"} · ops`;
		return current.tone === "ok" ? "Nominal · ops" : "Partial · ops";
	});

	useHead({
		title,
		link: [{ rel: "icon", type: "image/svg+xml", href: computed(() => favicon(MARK[failed.value ? "crit" : (verdict.value?.tone ?? "idle")]!)) }],
	});
}
