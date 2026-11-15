import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const files=(await readdir(new URL('../dist/assets/',import.meta.url))).filter(f=>f.endsWith('.js'))
assert.ok(files.length,'Build before checking release assets')
for(const name of files){
  const code=await readFile(new URL('../dist/assets/'+name,import.meta.url),'utf8')
  for(const sample of ['example-presentation','example-history','example-locked']) assert.ok(!code.includes(sample),'Release contains a fixture or placeholder: '+sample)
}
console.log('Production assets: no sample worry fixtures')
