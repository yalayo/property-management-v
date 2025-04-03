import fs from 'fs';

// Read the schema file
const schemaPath = './shared/schema-d1.ts';
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Replace all instances of default(0) and default(1) with default(sql`0`) and default(sql`1`)
// but only when they're part of integer("...", { mode: "boolean" }) columns
let updatedContent = schemaContent.replace(
  /integer\(\s*["'][^"']+["']\s*,\s*{\s*mode\s*:\s*["']boolean["']\s*}\s*\)\.default\(\s*([01])\s*\)/g,
  (match, value) => {
    return match.replace(`default(${value})`, `default(sql\`${value}\`)`);
  }
);

// Write the updated content back to the file
fs.writeFileSync(schemaPath, updatedContent);
console.log('Schema file updated successfully!');
