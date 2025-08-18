import { execSync, spawn } from 'child_process';

/**
 * Inspect a container and return the first network it's attached to.
 */
function detectNetwork(container: string): string {
  const raw = execSync(
    `docker inspect --format "{{json .NetworkSettings.Networks}}" ${container}`
  ).toString().trim();
  const nets: Record<string, unknown> = JSON.parse(raw);
  const names = Object.keys(nets);
  if (names.length === 0) {
    throw new Error(`No network found for container "${container}"`);
  }
  return names[0];
}

/**
 * For each MongoDB container name in `containers`, spin up
 * a mongo-express:1.0.2 instance on host ports 8081, 8082, …
 * configured solely via the env-vars from Docker Hub.
 */
export function launchMongoUI(containers: string[]): void {
  if (!containers.length) {
    console.error('❌ No MongoDB containers detected.');
    process.exit(1);
  }

  // 1) Determine the shared Docker network
  const network = detectNetwork(containers[0]);

  containers.forEach((container, idx) => {
    const hostPort = 8081 + idx;
    console.log(
      `🚀 mongo-express for "${container}" → http://localhost:${hostPort}` +
      `  (network="${network}")`
    );

    const args = [
      'run', '--rm',

      // join the same network so the container name resolves
      '--network', network,

      // expose mongo-express UI port
      '-p', `${hostPort}:8081`,

      // ————————————————————————————————————————————
      // Configuration via ME_CONFIG_* flags (mongo-express:1.0.2)
      // :contentReference[oaicite:1]{index=1}
      // ————————————————————————————————————————————

      // full connection string to your MongoDB service
      '-e', `ME_CONFIG_MONGODB_URL=mongodb://${container}:27017`,

      // how many times to retry at startup (default 10)
      '-e', 'ME_CONFIG_CONNECT_RETRIES=10',

      // enable “admin” view/stats (default: true)
      '-e', 'ME_CONFIG_MONGODB_ENABLE_ADMIN=true',

      // basic-auth: set these two to enable
      '-e', 'ME_CONFIG_BASICAUTH_USERNAME=admin',
      '-e', 'ME_CONFIG_BASICAUTH_PASSWORD=pass',

      // cookie & session secrets (defaults: cookiesecret, sessionsecret)
      '-e', 'ME_CONFIG_SITE_COOKIESECRET=cookiesecret',
      '-e', 'ME_CONFIG_SITE_SESSIONSECRET=sessionsecret',

      // optional editor theme (default: default)
      '-e', 'ME_CONFIG_OPTIONS_EDITORTHEME=ambiance',

      // optional base URL & health-check path
      '-e', 'ME_CONFIG_SITE_BASEURL=/',
      '-e', 'ME_CONFIG_HEALTH_CHECK_PATH=/status',

      'mongo-express:1.0.2'
    ];

    const proc = spawn('docker', args, { stdio: 'inherit' });
    proc.on('exit', code => process.exit(code ?? 0));
  });
}
