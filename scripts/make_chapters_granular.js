const fs = require('fs');
const path = require('path');

// Function to extract subsections from HTML content
function extractSubsections(content) {
    const subsections = [];
    
    // Split content by h2 and h3 tags to find subsections
    const h2Matches = content.match(/<h2[^>]*id="[^"]*">([^<]*)<\/h2>/g);
    const h3Matches = content.match(/<h3[^>]*id="[^"]*">([^<]*)<\/h3>/g);
    
    // Combine all heading matches
    const allHeadings = [];
    
    if (h2Matches) {
        allHeadings.push(...h2Matches.map(match => ({
            type: 'h2',
            match: match,
            title: match.replace(/<h2[^>]*>([^<]*)<\/h2>/, '$1')
        })));
    }
    
    if (h3Matches) {
        allHeadings.push(...h3Matches.map(match => ({
            type: 'h3',
            match: match,
            title: match.replace(/<h3[^>]*>([^<]*)<\/h3>/, '$1')
        })));
    }
    
    // Sort headings by their position in the content
    allHeadings.sort((a, b) => content.indexOf(a.match) - content.indexOf(b.match));
    
    // Extract subsections based on headings
    for (let i = 0; i < allHeadings.length; i++) {
        const heading = allHeadings[i];
        const startIndex = content.indexOf(heading.match);
        const endIndex = i < allHeadings.length - 1 
            ? content.indexOf(allHeadings[i + 1].match) 
            : content.length;
        
        const subsectionContent = content.substring(startIndex, endIndex);
        
        // Check if this heading contains a subscript pattern (e.g., "1.19", "0.2.1")
        const subscriptMatch = heading.title.match(/(\d+\.\d+(?:\.\d+)?)/);
        
        if (subscriptMatch) {
            const subscript = subscriptMatch[1];
            const cleanTitle = heading.title.replace(/^\d+\.\s*/, ''); // Remove chapter number prefix
            
            subsections.push({
                id: `subsection-${subscript.replace(/\./g, '-')}`,
                number: subscript,
                title: cleanTitle,
                fullTitle: heading.title,
                type: heading.type,
                content: subsectionContent
            });
        }
    }
    
    return subsections;
}

// Function to process chapters and make them more granular
function makeChaptersGranular(chapters) {
    const granularChapters = [];
    
    chapters.forEach(chapter => {
        // Add the original chapter
        granularChapters.push({
            ...chapter,
            granularType: 'chapter'
        });
        
        // Extract and add subsections
        const subsections = extractSubsections(chapter.content);
        
        subsections.forEach(subsection => {
            granularChapters.push({
                ...subsection,
                parentChapter: chapter.id,
                parentNumber: chapter.number,
                granularType: 'subsection'
            });
        });
    });
    
    return granularChapters;
}

// Main function
function main() {
    try {
        // Read the original chapters.json file
        const chaptersPath = path.join(__dirname, '../frontend/src/data/chapters.json');
        const chapters = JSON.parse(fs.readFileSync(chaptersPath, 'utf8'));
        
        console.log(`Processing ${chapters.length} chapters...`);
        
        // Make chapters more granular
        const granularChapters = makeChaptersGranular(chapters);
        
        console.log(`Created ${granularChapters.length} granular sections (${chapters.length} original + ${granularChapters.length - chapters.length} subsections)`);
        
        // Write the granular chapters to a new file
        const outputPath = path.join(__dirname, '../frontend/src/data/chapters_granular.json');
        fs.writeFileSync(outputPath, JSON.stringify(granularChapters, null, 2));
        
        console.log(`Granular chapters saved to: ${outputPath}`);
        
        // Print summary of subsections found
        const subsections = granularChapters.filter(ch => ch.granularType === 'subsection');
        console.log('\nSubsections found:');
        subsections.forEach(sub => {
            console.log(`  ${sub.parentNumber}.${sub.number} - ${sub.title}`);
        });
        
    } catch (error) {
        console.error('Error processing chapters:', error);
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = {
    makeChaptersGranular,
    extractSubsections
}; 