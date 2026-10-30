import "server-only";

export function authConfigured() {
  return (
    sessionConfigured() &&
    Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB)
  );
}

export function sessionConfigured() {
  return Boolean(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL);
}

export function authOrigin() {
  return new URL(process.env.BETTER_AUTH_URL!).origin;
}
