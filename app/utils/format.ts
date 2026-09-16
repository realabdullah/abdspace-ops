const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

function scale(bytes: number): { value: number; unit: string; divisor: number } {
	let index = 0;
	let divisor = 1;
	while (bytes / divisor >= 1024 && index < UNITS.length - 1) {
		divisor *= 1024;
		index += 1;
	}
	return { value: bytes / divisor, unit: UNITS[index]!, divisor };
}

export function formatBytes(bytes: number): string {
	const { value, unit } = scale(bytes);
	return `${value.toFixed(value >= 100 || unit === "B" ? 0 : 1)} ${unit}`;
}

export function formatBytesPair(used: number, total: number): string {
	const { unit, divisor } = scale(total);
	const digits = total / divisor >= 100 || unit === "B" ? 0 : 1;
	return `${(used / divisor).toFixed(digits)} / ${(total / divisor).toFixed(digits)} ${unit}`;
}

export function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	if (days >= 1) return `${days} ${days === 1 ? "day" : "days"}`;
	const hours = Math.floor(seconds / 3600);
	if (hours >= 1) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
	const minutes = Math.max(1, Math.floor(seconds / 60));
	return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function formatAge(seconds: number): string {
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export function shortId(value: string): string {
	const normalized = value.replace(/^sha256:/, "");
	return normalized.length > 12 ? normalized.slice(0, 12) : normalized;
}

const TIME = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
const DATE_TIME = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export function formatMoment(iso: string): string {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return "unknown";

	const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(at)) / 86_400_000);

	if (daysAgo <= 0) return `today at ${TIME.format(at)}`;
	if (daysAgo === 1) return `yesterday at ${TIME.format(at)}`;
	return DATE_TIME.format(at);
}

export function formatClock(iso: string): string {
	const at = new Date(iso);
	return Number.isNaN(at.getTime()) ? "unknown" : TIME.format(at);
}

export function splitImage(image: string): { repository: string; tag: string } {
	const separator = image.lastIndexOf(":");
	if (separator === -1 || image.indexOf("/", separator) !== -1) return { repository: image, tag: "latest" };
	return { repository: image.slice(0, separator), tag: image.slice(separator + 1) };
}
