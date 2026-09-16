import { cpus, hostname, loadavg, freemem, totalmem, uptime } from "node:os";
import { readFile, statfs } from "node:fs/promises";
import type { CpuStats, DiskStats, MemoryStats, ServerStats } from "#shared/types/dashboard";

interface CpuSample {
	at: number;
	idle: number;
	total: number;
}

let lastSample: CpuSample | null = null;

function sampleCpu(): CpuSample {
	let idle = 0;
	let total = 0;
	for (const cpu of cpus()) {
		idle += cpu.times.idle;
		total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
	}
	return { at: Date.now(), idle, total };
}

function usageBetween(from: CpuSample, to: CpuSample): number {
	const totalDelta = to.total - from.total;
	const idleDelta = to.idle - from.idle;
	if (totalDelta <= 0) return 0;
	return clampPercent(((totalDelta - idleDelta) / totalDelta) * 100);
}

async function readCpu(): Promise<CpuStats> {
	const now = sampleCpu();
	const usable = lastSample && now.at - lastSample.at >= 1000 && now.at - lastSample.at <= 30_000;

	let usagePercent: number;
	if (usable && lastSample) {
		usagePercent = usageBetween(lastSample, now);
		lastSample = now;
	} else {
		await new Promise((resolve) => setTimeout(resolve, 250));
		const second = sampleCpu();
		usagePercent = usageBetween(now, second);
		lastSample = second;
	}

	const load = loadavg();
	return {
		usagePercent,
		cores: cpus().length,
		load: [round(load[0] ?? 0, 2), round(load[1] ?? 0, 2), round(load[2] ?? 0, 2)],
	};
}

async function readMemory(): Promise<MemoryStats> {
	let totalBytes = totalmem();
	let availableBytes = freemem();

	try {
		const meminfo = await readFile("/proc/meminfo", "utf8");
		const total = matchKb(meminfo, "MemTotal");
		const available = matchKb(meminfo, "MemAvailable");
		if (total && available) {
			totalBytes = total;
			availableBytes = available;
		}
	} catch {
		totalBytes = totalmem();
		availableBytes = freemem();
	}

	const usedBytes = Math.max(0, totalBytes - availableBytes);
	return { usedBytes, totalBytes, usagePercent: percentOf(usedBytes, totalBytes) };
}

function matchKb(meminfo: string, key: string): number | null {
	const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+) kB$`, "m"));
	return match?.[1] ? Number(match[1]) * 1024 : null;
}

async function readDisk(path: string): Promise<DiskStats> {
	const stats = await statfs(path);
	const totalBytes = stats.blocks * stats.bsize;
	const availableBytes = stats.bavail * stats.bsize;
	const usedBytes = Math.max(0, totalBytes - availableBytes);
	return { usedBytes, totalBytes, usagePercent: percentOf(usedBytes, totalBytes) };
}

async function readUptime(): Promise<number> {
	try {
		const raw = await readFile("/proc/uptime", "utf8");
		const seconds = Number(raw.split(/\s+/)[0]);
		if (Number.isFinite(seconds) && seconds > 0) return Math.floor(seconds);
	} catch {
		return Math.floor(uptime());
	}
	return Math.floor(uptime());
}

export async function readServerStats(diskPath: string): Promise<ServerStats> {
	const [cpu, memory, disk, uptimeSeconds] = await Promise.all([readCpu(), readMemory(), readDisk(diskPath), readUptime()]);
	return { hostname: hostname(), uptimeSeconds, cpu, memory, disk };
}

function percentOf(used: number, total: number): number {
	if (total <= 0) return 0;
	return clampPercent((used / total) * 100);
}

function clampPercent(value: number): number {
	return round(Math.min(100, Math.max(0, value)), 1);
}

function round(value: number, places: number): number {
	const factor = 10 ** places;
	return Math.round(value * factor) / factor;
}
