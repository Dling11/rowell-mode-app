import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const file = ".env.local";
const original = await readFile(file, "utf8");
const env = parseEnv(original);
const origin = new URL(env.BETTER_AUTH_URL || "http://localhost:3000");
if (
  origin.username ||
  origin.password ||
  (origin.protocol !== "https:" &&
    !(origin.protocol === "http:" && origin.hostname === "localhost"))
)
  throw new Error(
    "Use localhost locally or your trusted HTTPS origin for owner setup.",
  );
let updated = original;
for (const [key, value] of Object.entries({
  BETTER_AUTH_URL: origin.origin,
  BETTER_AUTH_SECRET:
    env.BETTER_AUTH_SECRET || randomBytes(48).toString("base64url"),
  OWNER_SETUP_TOKEN: env.OWNER_SETUP_TOKEN || randomBytes(32).toString("hex"),
})) {
  const pattern = new RegExp(`^${key}=[^\\r\\n]*`, "m");
  updated = pattern.test(updated)
    ? updated.replace(pattern, () => `${key}=${value}`)
    : updated + (updated.endsWith("\n") ? "" : "\n") + `${key}=${value}\n`;
}
if ((await readFile(file, "utf8")) !== original)
  throw new Error(
    "Configuration changed during setup. It was preserved; rerun this command.",
  );
if (updated !== original) await writeFile(file, updated);
const configured = parseEnv(updated);
const link = new URL("/admin/setup", origin);
link.hash = new URLSearchParams({
  setup: configured.OWNER_SETUP_TOKEN,
}).toString();
const executable =
  process.platform === "win32"
    ? "rundll32.exe"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
const args =
  process.platform === "win32"
    ? ["url.dll,FileProtocolHandler", link.href]
    : [link.href];
const child = spawn(executable, args, {
  stdio: "ignore",
  detached: true,
  windowsHide: true,
});
child.once("error", () => {
  console.error(
    "The setup browser could not be opened. Open /admin/setup and use the private code from .env.local.",
  );
  process.exitCode = 1;
});
child.unref();
console.log(
  "Opened the private owner setup link in your browser. The code was not printed. Choose your own username and password there.",
);
