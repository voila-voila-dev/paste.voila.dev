import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./src/repositories/drizzle/migrations",
	schema: "./src/repositories/drizzle/tables/index.ts",
	dialect: "sqlite",
	driver: "d1-http",
	strict: true,
	verbose: true,
});
