import fs from 'node:fs'

const path = 'apps/workbench/TASKS.md'
const title = process.env.PR_TITLE
const number = process.env.PR_NUMBER
const url = process.env.PR_URL

if (!title || !number || !url) process.exit(0)

const content = fs.readFileSync(path, 'utf8')
if (content.includes(`(#${number})`) || content.includes(`/${number})`)) process.exit(0)

const doneHeader = '\n# Done\n\n'
const idx = content.indexOf(doneHeader)
if (idx === -1) process.exit(0)

const entry = `- **${title}** (#${number}) — ${url}.\n`
const insertAt = idx + doneHeader.length
const updated = content.slice(0, insertAt) + entry + content.slice(insertAt)
fs.writeFileSync(path, updated)
