import { MAX_SAVE_BYTES } from "./schema";

const rawSave =
  /(?:^|\/)(?:system|user[123]|data\.bin|[^/]+\.(?:sav|dat|bin))$/i;
const extra = /\.(?:json|txt|ini|xml|yml|yaml)$/i;
export function safeSavePath(path: string) {
  return (
    path.length > 0 &&
    path.length < 240 &&
    !/[\\\x00-\x1f\x7f:]/.test(path) &&
    !path.startsWith("/") &&
    path
      .split("/")
      .every((part) => part !== ".." && part !== "." && part.length > 0)
  );
}
export function isSaveEntry(path: string) {
  return safeSavePath(path) && rawSave.test(path);
}

// Read only the ZIP directory. Never extract or decompress visitor files.
// Both the request and advertised expanded content are bounded.
export function validateSaveFile(name: string, bytes: Uint8Array) {
  if (!safeSavePath(name) || name.includes("/"))
    throw new Error("Use a simple file name without folders.");
  if (!bytes.length || bytes.length > MAX_SAVE_BYTES)
    throw new Error(
      "Choose a save backup up to 4 MB. Game images and apps are not supported.",
    );
  if (!/\.zip$/i.test(name)) {
    if (!isSaveEntry(name))
      throw new Error(
        "Choose an exported save ZIP, a save file, or upload a save folder.",
      );
    if (
      (bytes[0] === 0x4d && bytes[1] === 0x5a) ||
      (bytes[0] === 0x7f && bytes[1] === 0x45) ||
      (bytes[0] === 0x50 && bytes[1] === 0x4b)
    )
      throw new Error(
        "This does not look like a raw game save. Choose its original file name.",
      );
    return;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (
    let offset = bytes.length - 22;
    offset >= Math.max(0, bytes.length - 65557);
    offset--
  ) {
    if (
      view.getUint32(offset, true) === 0x06054b50 &&
      offset + 22 + view.getUint16(offset + 20, true) === bytes.length
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0)
    throw new Error("The ZIP is incomplete or invalid. Export it again.");
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let cursor = view.getUint32(end + 16, true);
  const directoryEnd = cursor + directorySize;
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count ||
    !count ||
    count > 256 ||
    directoryEnd !== end
  )
    throw new Error(
      "Choose a single ZIP with at most 256 save files. Split and ZIP64 archives are not supported.",
    );
  let expanded = 0,
    saves = 0;
  const paths = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (
      cursor + 46 > directoryEnd ||
      view.getUint32(cursor, true) !== 0x02014b50
    )
      throw new Error("Invalid ZIP file list.");
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true),
      unpacked = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true),
      extraLength = view.getUint16(cursor + 30, true),
      commentLength = view.getUint16(cursor + 32, true);
    const mode = view.getUint32(cursor + 38, true) >>> 16;
    const local = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (
      next > directoryEnd ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      (mode & 0xf000) === 0xa000 ||
      local + 30 > view.getUint32(end + 16, true)
    )
      throw new Error(
        "Encrypted, linked or unsupported ZIP entries are not allowed.",
      );
    const path = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    const directory = path.endsWith("/");
    const clean = directory ? path.slice(0, -1) : path;
    if (
      !safeSavePath(clean) ||
      paths.has(path.toLowerCase()) ||
      (!directory && !isSaveEntry(path) && !extra.test(path))
    )
      throw new Error(
        "This archive contains other files. Upload only exported saves and backup settings.",
      );
    paths.add(path.toLowerCase());
    if (view.getUint32(local, true) !== 0x04034b50)
      throw new Error("Invalid ZIP entry.");
    const localNameLength = view.getUint16(local + 26, true),
      localExtra = view.getUint16(local + 28, true);
    if (
      local + 30 + localNameLength + localExtra + compressed >
        view.getUint32(end + 16, true) ||
      new TextDecoder().decode(
        bytes.subarray(local + 30, local + 30 + localNameLength),
      ) !== path
    )
      throw new Error("ZIP file names or sizes do not match.");
    expanded += unpacked;
    if (!directory && isSaveEntry(path)) saves++;
    if (expanded > 32 * 1024 * 1024)
      throw new Error(
        "The expanded backup exceeds 32 MB. Choose only the save folder.",
      );
    cursor = next;
  }
  if (cursor !== directoryEnd || !saves)
    throw new Error(
      "No recognized save files were found. Choose the dated export or the folder containing system / user files.",
    );
}
