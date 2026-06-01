const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\usuario\\.gemini\\antigravity\\brain\\4ce39c37-81ff-466c-b397-526b1962ca38\\.system_generated\\logs\\transcript.jsonl';

const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 3260 && obj.step_index <= 3300) {
      if (line.includes('functions deploy') || line.includes('deploy')) {
        console.log(`Step ${obj.step_index} (${obj.source}):`);
        console.log(`  Content: ${obj.content ? obj.content.substring(0, 300) : ''}`);
        if (obj.tool_calls) {
          console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
        }
        console.log('---');
      }
    }
  } catch(e) {}
});
