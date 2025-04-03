import fs from 'fs';

// Read the file content
const filePath = 'server/cloudflare-storage.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of "await db." with "const database = getDb();" and "await database."
// but make sure we don't replace it twice in the same function
const lines = content.split('\n');
let modifiedLines = [];
let functionStarted = false;
let dbReplaced = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if a new function is starting
  if (line.trim().startsWith('async ')) {
    functionStarted = true;
    dbReplaced = false;
  }
  
  // If we see a direct db usage and haven't replaced it in this function yet
  if (functionStarted && line.includes('await db.') && !dbReplaced) {
    // Add the "const database = getDb();" line before using db
    modifiedLines.push('    const database = getDb();');
    // Replace "db" with "database" in this line
    modifiedLines.push(line.replace(/db\./g, 'database.'));
    dbReplaced = true;
  } else if (functionStarted && line.includes('db.') && !dbReplaced) {
    // For non-await db usage, still add the getDb() line
    modifiedLines.push('    const database = getDb();');
    // Replace "db" with "database" in this line
    modifiedLines.push(line.replace(/db\./g, 'database.'));
    dbReplaced = true;
  } else if (functionStarted && line.includes('db.')) {
    // For subsequent db usages in the same function, just replace db with database
    modifiedLines.push(line.replace(/db\./g, 'database.'));
  } else {
    modifiedLines.push(line);
  }
  
  // Check if a function is ending
  if (functionStarted && line.trim() === '}') {
    functionStarted = false;
  }
}

// Write the modified content back to the file
fs.writeFileSync(filePath, modifiedLines.join('\n'));
console.log('CloudflareStorage has been updated to use getDb() instead of direct db access.');
