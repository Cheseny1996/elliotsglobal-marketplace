export function databaseIsConfigured() {
  return Boolean(process.env.MONGODB_URI);
}
