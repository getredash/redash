import fs from 'node:fs'
import { PNG } from 'pngjs'
const [file, out, x, y, w, h] = process.argv.slice(2); const src = PNG.sync.read(fs.readFileSync(file))
const dst = new PNG({ width: +w, height: Math.min(+h, src.height - +y) }); PNG.bitblt(src, dst, +x, +y, +w, dst.height, 0, 0)
fs.writeFileSync(out, PNG.sync.write(dst))
