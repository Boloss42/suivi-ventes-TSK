import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Génère un mot de passe temporaire lisible, transmis une seule fois au client. */
export function generateTempPassword(length = 10) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return password;
}
