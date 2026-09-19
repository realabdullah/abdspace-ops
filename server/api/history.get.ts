import type { HistoryPayload } from "#shared/types/dashboard";

export default defineEventHandler(async (event): Promise<HistoryPayload> => {
	setResponseHeader(event, "cache-control", "no-store");
	return readHistory(dashboardConfig().historyPath);
});
