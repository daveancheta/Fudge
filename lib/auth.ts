import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from ".."; // your drizzle instance
import * as schema from "../db/schema"; // your drizzle instance

export const auth = betterAuth({
    trustedOrigins: [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_REMOTE_API_URL,
        "http://tauri.localhost",
        ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
    ].filter((origin): origin is string => Boolean(origin)),
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    baseURL: process.env.BETTER_AUTH_URL, 
    ...(process.env.NODE_ENV === "production" ? {
        advanced: {
            defaultCookieAttributes: { sameSite: "none" as const, secure: true },
        },
    } : {}),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});
