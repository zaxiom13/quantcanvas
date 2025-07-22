const fs = require('fs');
const path = require('path');

// Read and examine the granular chapters
const granularPath = path.join(__dirname, '../frontend/src/data/chapters_granular.json');
const granularChapters = JSON.parse(fs.readFileSync(granularPath, 'utf8'));

console.log(`Total entries: ${granularChapters.length}`);

// Show first few entries
console.log('\n=== First 3 entries ===');
granularChapters.slice(0, 3).forEach((entry, index) => {
    console.log(`\nEntry ${index + 1}:`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Number: ${entry.number}`);
    console.log(`  Title: ${entry.title}`);
    console.log(`  Full Title: ${entry.fullTitle}`);
    console.log(`  Granular Type: ${entry.granularType}`);
    if (entry.parentChapter) {
        console.log(`  Parent Chapter: ${entry.parentChapter}`);
        console.log(`  Parent Number: ${entry.parentNumber}`);
    }
    console.log(`  Content length: ${entry.content ? entry.content.length : 0} characters`);
});

// Show some subsection examples
console.log('\n=== Sample Subsections ===');
const subsections = granularChapters.filter(ch => ch.granularType === 'subsection');
subsections.slice(0, 5).forEach((sub, index) => {
    console.log(`\nSubsection ${index + 1}:`);
    console.log(`  ID: ${sub.id}`);
    console.log(`  Number: ${sub.number}`);
    console.log(`  Title: ${sub.title}`);
    console.log(`  Parent: ${sub.parentNumber}.${sub.number}`);
    console.log(`  Type: ${sub.type}`);
});

// Show statistics
console.log('\n=== Statistics ===');
const chapters = granularChapters.filter(ch => ch.granularType === 'chapter');
const h2Subsections = subsections.filter(sub => sub.type === 'h2');
const h3Subsections = subsections.filter(sub => sub.type === 'h3');

console.log(`Original chapters: ${chapters.length}`);
console.log(`H2 subsections: ${h2Subsections.length}`);
console.log(`H3 subsections: ${h3Subsections.length}`);
console.log(`Total subsections: ${subsections.length}`);

// Show some examples of the subscript patterns found
console.log('\n=== Sample Subscript Patterns ===');
const uniquePatterns = [...new Set(subsections.map(sub => sub.number))].slice(0, 10);
uniquePatterns.forEach(pattern => {
    console.log(`  ${pattern}`);
}); 