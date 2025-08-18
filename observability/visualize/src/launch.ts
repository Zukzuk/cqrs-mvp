import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function launchStructurizrUI(
  dslText: string,
): void {
  // Ensure './diagram' directory exists in the current working directory
  const diagramDir = path.join(process.cwd(), 'diagram');
  if (!fs.existsSync(diagramDir)) {
    fs.mkdirSync(diagramDir, { recursive: true });
  }

  // Define the DSL file path
  const dslFile = path.join(diagramDir, 'workspace.dsl');
  fs.writeFileSync(dslFile, dslText, 'utf-8');

  console.log(`🚀 Starting Structurizr Lite UI at http://localhost:8000`);

  // Docker run arguments for Structurizr Lite
  const dockerArgs = [
    'run', '--rm',
    '-p', '8000:8080',
    '-v', `${diagramDir}:/usr/local/structurizr`,
    'structurizr/lite'
  ];

  // Spawn Docker container
  const proc = spawn('docker', dockerArgs, { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code ?? 0));
}
