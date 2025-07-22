const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Read the HTML file
const htmlFilePath = path.join(__dirname, '../Q_for_Mortals_Complete_2025-07-13 (1).html');
const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

// Parse the HTML
const dom = new JSDOM(htmlContent);
const document = dom.window.document;

// Extract chapters
const chapters = [];
const chapterElements = document.querySelectorAll('.chapter');

chapterElements.forEach((chapter, index) => {
    const titleElement = chapter.querySelector('.chapter-title');
    const title = titleElement ? titleElement.textContent.replace('¶', '').trim() : `Chapter ${index}`;
    
    // Get the chapter content (everything after the header)
    const content = chapter.innerHTML;
    
    // Extract just the chapter number and name for cleaner display
    const titleMatch = title.match(/^(\d+|[AB])\.\s*(.+)$/);
    const chapterNumber = titleMatch ? titleMatch[1] : index.toString();
    const chapterName = titleMatch ? titleMatch[2] : title;
    
    chapters.push({
        id: `chapter-${index}`,
        number: chapterNumber,
        title: chapterName,
        fullTitle: title,
        content: content
    });
});

// Create the output directory if it doesn't exist
const outputDir = path.join(__dirname, '../frontend/src/data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Write the chapters to a JSON file
const outputPath = path.join(outputDir, 'chapters.json');
fs.writeFileSync(outputPath, JSON.stringify(chapters, null, 2));

console.log(`Successfully extracted ${chapters.length} chapters to ${outputPath}`);
console.log('Chapter titles:');
chapters.forEach((chapter, index) => {
    console.log(`${index}: ${chapter.fullTitle}`);
}); 