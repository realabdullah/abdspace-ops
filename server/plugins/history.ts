export default defineNitroPlugin(() => {
	const config = dashboardConfig();
	if (!config.historyPath) return;
	const collect = () => collectHistory(config).catch((error) => console.error("[history] collection failed", error));
	void collect();
	const timer = setInterval(collect, 60_000);
	timer.unref();
});
