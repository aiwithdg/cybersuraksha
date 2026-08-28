import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const adminSessionCookie = "cybersuraksha_admin";

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    sessionSecret: process.env.ADMIN_SESSION_SECRET,
  };
}

export function adminAuthConfigured() {
  const credentials = getAdminCredentials();
  return Boolean(credentials.username && credentials.password && credentials.sessionSecret);
}

export function isAdminAuthenticated() {
  const credentials = getAdminCredentials();

  if (!credentials.username || !credentials.sessionSecret) {
    return false;
  }

  const cookieValue = cookies().get(adminSessionCookie)?.value;

  if (!cookieValue) {
    return false;
  }

  return cookieValue === createAdminSessionToken(credentials.username, credentials.sessionSecret);
}

export function setAdminSession(username: string) {
  const { sessionSecret } = getAdminCredentials();

  if (!sessionSecret) {
    return;
  }

  cookies().set(adminSessionCookie, createAdminSessionToken(username, sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
}

export function clearAdminSession() {
  cookies().delete(adminSessionCookie);
}

export function credentialsMatch(username: string, password: string) {
  const credentials = getAdminCredentials();

  if (!credentials.username || !credentials.password) {
    return false;
  }

  return safeEqual(username, credentials.username) && safeEqual(password, credentials.password);
}

function createAdminSessionToken(username: string, secret: string) {
  const signature = createHmac("sha256", secret).update(username).digest("hex");
  return `${username}.${signature}`;
}

function safeEqual(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  );
}
