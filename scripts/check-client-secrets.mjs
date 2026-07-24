import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const sourceRoots = ['src', 'dist']
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.mjs', '.ts', '.tsx'])
const allowedClientVariables = new Set([
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL',
])
const secretVariableWords = /(?:API_?KEY|PASSWORD|PRIVATE|SECRET|SERVICE_?ROLE|TOKEN)/u
const secretPatterns = [
  ['Supabase secret key', /sb_secret_[A-Za-z0-9._-]{20,}/gu],
  ['OpenRouter API key', /sk-or-v1-[A-Za-z0-9]{20,}/gu],
  ['Stripe live secret key', /sk_live_[A-Za-z0-9]{20,}/gu],
  ['Google API key', /AIza[A-Za-z0-9_-]{30,}/gu],
  ['AWS access key', /AKIA[A-Z0-9]{16}/gu],
  ['private key material', /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/gu],
]

const findings = []
for (const sourceRoot of sourceRoots) {
  const absoluteRoot = path.join(root, sourceRoot)
  if (!(await exists(absoluteRoot))) continue
  for (const file of await walkTextFiles(absoluteRoot)) {
    const relative = path.relative(root, file)
    const content = await readFile(file, 'utf8')
    findForbiddenClientVariables(relative, content)
    findKnownSecretFormats(relative, content)
    findServiceRoleJwts(relative, content)
  }
}

if (findings.length > 0) {
  console.error('Potential client-side secrets detected:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('client secret boundary: no private credentials found in source or dist')

async function exists(file) {
  return stat(file).then(() => true, () => false)
}

async function walkTextFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkTextFiles(fullPath))
    } else if (
      textExtensions.has(path.extname(entry.name)) &&
      !/\.(?:spec|test)\.[^.]+$/u.test(entry.name)
    ) {
      files.push(fullPath)
    }
  }
  return files
}

function findForbiddenClientVariables(file, content) {
  for (const match of content.matchAll(/\bVITE_[A-Z0-9_]+\b/gu)) {
    const variable = match[0]
    if (
      !allowedClientVariables.has(variable) &&
      secretVariableWords.test(variable)
    ) {
      findings.push(`${file}: forbidden client environment variable ${variable}`)
    }
  }
}

function findKnownSecretFormats(file, content) {
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(content)) findings.push(`${file}: ${label}`)
  }
}

function findServiceRoleJwts(file, content) {
  for (const match of content.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'))
      if (payload?.role === 'service_role') {
        findings.push(`${file}: Supabase service-role JWT`)
      }
    } catch {
      // Ignore strings that merely resemble JWTs.
    }
  }
}
