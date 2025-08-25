// setup.js
const fs = require('fs');
const path = require('path');

const samplePath = path.join(__dirname, 'env_sample.json');
const targetPath = path.join(__dirname, 'env.json');

if (fs.existsSync(targetPath)) {
  console.log('env.json already exists. No changes made.');
} else {
  fs.copyFileSync(samplePath, targetPath);
  console.log('env.json has been created from env_sample.json');
}
