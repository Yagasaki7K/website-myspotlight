/** A small standards-compliant STORE ZIP writer. It runs fully in the browser and preserves insertion order. */
const encoder = new TextEncoder();
const crcTable = new Uint32Array(256).map((_, index) => { let c = index; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (bytes: Uint8Array) => { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
const u16 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255);
const u32 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
const join = (parts: Uint8Array[]) => { const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; parts.forEach((part) => { result.set(part, offset); offset += part.length; }); return result; };

export interface ZipEntry { name: string; blob: Blob }
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const files = await Promise.all(entries.map(async ({ name, blob }) => ({ name: encoder.encode(name), data: new Uint8Array(await blob.arrayBuffer()) })));
  let offset = 0; const locals: Uint8Array[] = []; const central: Uint8Array[] = [];
  for (const file of files) {
    const crc = crc32(file.data); const flag = 0x0800;
    const local = join([u32(0x04034b50), u16(20), u16(flag), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(file.name.length), u16(0), file.name, file.data]);
    locals.push(local);
    central.push(join([u32(0x02014b50), u16(20), u16(20), u16(flag), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(file.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), file.name]));
    offset += local.length;
  }
  const directory = join(central);
  return new Blob([join([...locals, directory, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(directory.length), u32(offset), u16(0)])], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
