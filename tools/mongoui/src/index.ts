import { detectMongoContainers } from './detect';
import { launchMongoUI }      from './launch';

(async function main() {
  let containers = process.argv.slice(2);

  if (containers.length === 0) {
    containers = detectMongoContainers();
    console.log(`🔍 Found MongoDB containers: ${containers.join(', ')}`);
  }

  if (containers.length === 0) {
    console.error('❌ No MongoDB containers found.');
    process.exit(1);
  }

  launchMongoUI(containers);
})();
