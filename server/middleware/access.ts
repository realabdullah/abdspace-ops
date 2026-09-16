import type { H3Event } from "h3";
import { createRemoteJWKSet, jwtVerify } from "jose";

type AccessConfig = DashboardConfig["cfAccess"];

let cached: { issuer: string; keys: ReturnType<typeof createRemoteJWKSet> } | null = null;

function keySet(issuer: string) {
	if (cached?.issuer !== issuer) {
		cached = { issuer, keys: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)) };
	}
	return cached.keys;
}

function assertion(event: H3Event): string {
	return getRequestHeader(event, "cf-access-jwt-assertion") || getCookie(event, "CF_Authorization") || "";
}

async function verifyAccessJwt(event: H3Event, config: AccessConfig) {
	const token = assertion(event);
	if (!token) throw createError({ statusCode: 403, statusMessage: "Forbidden" });

	try {
		await jwtVerify(token, keySet(config.issuer), {
			issuer: config.issuer,
			audience: config.audience,
		});
	} catch {
		throw createError({ statusCode: 403, statusMessage: "Forbidden" });
	}
}

export default defineEventHandler(async (event) => {
	if (event.path === "/api/health") return;

	const { cfAccess, requireCfAccess } = dashboardConfig();

	if (cfAccess.issuer && cfAccess.audience) return verifyAccessJwt(event, cfAccess);

	if (cfAccess.issuer || cfAccess.audience) {
		console.error("[access] CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD must both be set");
		throw createError({ statusCode: 500, statusMessage: "Access misconfigured" });
	}

	if (!requireCfAccess) return;

	if (!getRequestHeader(event, "cf-access-authenticated-user-email")) {
		throw createError({ statusCode: 403, statusMessage: "Forbidden" });
	}
});
