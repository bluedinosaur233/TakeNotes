import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

export function validPasswordHash(hash: string) {
  return /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(hash);
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("密码长度须为 12–128 个字符");
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  if (!validPasswordHash(encoded) || password.length > 128) return false;
  const [, salt, expected] = encoded.split(":");
  return timingSafeEqual(await derive(password, salt), Buffer.from(expected, "hex"));
}

export function credentialVersion(username: string, hash: string) {
  return createHash("sha256").update(`${username}\0${hash}`).digest("hex");
}
