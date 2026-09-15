import "dotenv/config";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { ensureSQLiteFile } from "./init-database.mjs";

await ensureSQLiteFile();
const child = spawn(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
const [code] = await once(child, "exit");
process.exitCode = code ?? 1;
