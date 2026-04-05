const fs = require('fs');

// Read and parse the dataset
const data = JSON.parse(fs.readFileSync('./src/dataset.json', 'utf-8'));

// Add z: 0.0 to all nodes
data.nodes.forEach(node => {
  node.z = 0.0;
});

// Write back with proper formatting
fs.writeFileSync('./src/dataset.json', JSON.stringify(data, null, 2), 'utf-8');
console.log(`Successfully added z: 0.0 to ${data.nodes.length} nodes!`);
