export default defineNuxtConfig({
	modules: ["@nuxt/eslint", "@nuxt/ui"],
	ssr: false,
	devtools: { enabled: false },
	css: ["~/assets/css/main.css"],
	app: {
		head: {
			htmlAttrs: { lang: "en" },
			charset: "utf-8",
			viewport: "width=device-width, initial-scale=1",
			title: "Server",
			meta: [{ name: "robots", content: "noindex, nofollow" }],
		},
	},
	nitro: {
		preset: "node-server",
	},
	compatibilityDate: "2025-09-16",
	eslint: { config: { stylistic: false } },
});
