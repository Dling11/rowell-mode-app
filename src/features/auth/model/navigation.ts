export function ownerDestination(value?: string) {
  return value === "/install" || value === "/gallery" || value === "/updates"
    ? value
    : "/admin";
}
