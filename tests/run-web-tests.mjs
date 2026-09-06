import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const forwardedArguments = process.argv.slice(2)
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

try {
  run('npx', ['supabase', 'start', '--exclude', excludedServices])
  run('npx', ['supabase', 'db', 'reset'])

  const statusOutput = execFileSync(
    'npx',
    ['supabase', 'status', '--output', 'json'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
  const localSupabase = JSON.parse(statusOutput)
  const testEnvironment = {
    ...process.env,
    VITE_SUPABASE_URL: localSupabase.API_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      localSupabase.PUBLISHABLE_KEY ?? localSupabase.ANON_KEY,
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
  const stopResult = spawnSync('npx', ['supabase', 'stop'], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (stopResult.status !== 0 && exitCode === 0) exitCode = stopResult.status ?? 1
}

process.exit(exitCode)
