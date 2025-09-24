import fs from 'fs';
import path from 'path';

export async function writeDsl(dsl: string, rootDir: string): Promise<string> {
  // Ensure output directory exists
  const outputDir = path.join(rootDir, 'diagram');
  fs.mkdirSync(outputDir, { recursive: true });
  // Write DSL to file
  const fileName = `workspace.dsl`;
  const filePath = path.join(outputDir, fileName);
  // Write the DSL content to the file
  fs.writeFileSync(filePath, dsl, { encoding: 'utf-8' });
  console.log(`✅ DSL generated: ${filePath}`);
  // Return the file name for further use
  return fileName;
}