import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const forwardedArguments = process.argv.slice(2)
const apiPort = process.env.POMA_TEST_API_PORT ?? '8000'
const apiUrl = `http://127.0.0.1:${apiPort}`
const excludedServices = [
  'realtime',
  'storage-api',
  'imgproxy',
  'postgres-meta',
  'studio',
  'edge-runtime',
  'logflare',
  'vector',
  'supavisor',
  'mailpit',
].join(',')

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${arguments_.join(' ')} terminó con código ${result.status}`)
  }
}

let exitCode = 1
let apiProcess

async function waitForUrl(url, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The process is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
  }
  throw new Error(`El servicio no respondió a tiempo: ${url}`)
}

try {
  run('npx', ['supabase', 'start', '--exclude', excludedServices])
  run('npx', ['supabase', 'db', 'reset'])

  const statusOutput = execFileSync(
    'npx',
    ['supabase', 'status', '--output', 'json'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
  const localSupabase = JSON.parse(statusOutput)
  const apiEnvironment = {
    ...process.env,
    SUPABASE_URL: localSupabase.API_URL,
    SUPABASE_PUBLISHABLE_KEY:
      localSupabase.PUBLISHABLE_KEY ?? localSupabase.ANON_KEY,
    SIMPHONY_BASE_URL: 'http://127.0.0.1:9100',
    SIMPHONY_AUTH_MODE: 'static',
    SIMPHONY_TOKEN: 'test-only-token',
    SIMPHONY_ORG_SHORT_NAME: 'POMALAB',
    SIMPHONY_LOC_REF: 'barcelona01',
    SIMPHONY_RVC_REF: '1',
    ENABLE_LAB_ENDPOINTS: 'false',
    CORS_ORIGINS: 'http://127.0.0.1:4173',
  }
  apiProcess = spawn(
    'uv',
    [
      'run',
      '--frozen',
      '--project',
      'apps/api',
      'uvicorn',
      'poma_api.main:app',
      '--host',
      '127.0.0.1',
      '--port',
      apiPort,
    ],
    {
      cwd: repositoryRoot,
      env: apiEnvironment,
      stdio: 'inherit',
    },
  )
  await waitForUrl(`${apiUrl}/openapi.json`)

  const testEnvironment = {
    ...apiEnvironment,
    VITE_SUPABASE_URL: localSupabase.API_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      localSupabase.PUBLISHABLE_KEY ?? localSupabase.ANON_KEY,
    VITE_API_URL: apiUrl,
  }

  const result = spawnSync(
    'npx',
    ['playwright', 'test', ...forwardedArguments],
    {
      cwd: repositoryRoot,
      env: testEnvironment,
      stdio: 'inherit',
    },
  )

  if (result.error) throw result.error
  exitCode = result.status ?? 1
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
} finally {
  if (apiProcess && !apiProcess.killed) apiProcess.kill('SIGTERM')
  const stopResult = spawnSync('npx', ['supabase', 'stop'], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (stopResult.status !== 0 && exitCode === 0) exitCode = stopResult.status ?? 1
}

process.exit(exitCode)
