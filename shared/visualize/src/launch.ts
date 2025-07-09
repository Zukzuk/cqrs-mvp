import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Writes the given DSL text to a persistent 'diagram/workspace.dsl' file and
 * launches Structurizr Lite UI in Docker on the specified port.
 *
 * @param dslText     The Structurizr DSL content
 * @param projectName Used for naming the Docker volume mount tag
 * @param port        Host port to bind to (default 7000)
 */
export function launchStructurizrUI(
  dslText: string,
  projectName: string,
  port: number = 7000
): void {
  // Ensure './diagram' directory exists in the current working directory
  const diagramDir = path.join(process.cwd(), 'diagram');
  if (!fs.existsSync(diagramDir)) {
    fs.mkdirSync(diagramDir, { recursive: true });
  }

  // Define the DSL file path
  const dslFile = path.join(diagramDir, 'workspace.dsl');

  // Write the DSL into workspace.dsl under './diagram'
  fs.writeFileSync(dslFile, dslText, 'utf-8');

  console.log(`🚀 Starting Structurizr Lite UI at http://localhost:${port}`);
  console.log(`   (serving DSL file: ${dslFile})`);

  // Docker run arguments for Structurizr Lite
  const dockerArgs = [
    'run', '--rm', '-it',
    '-p', `${port}:8080`,
    '-v', `${diagramDir}:/usr/local/structurizr`,
    'structurizr/lite'
  ];

  // Spawn Docker container
  const proc = spawn('docker', dockerArgs, { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code ?? 0));
}
