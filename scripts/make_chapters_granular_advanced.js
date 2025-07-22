const fs = require('fs');
const path = require('path');

// Enhanced function to extract subsections with more options
function extractSubsectionsAdvanced(content, options = {}) {
    const {
        includeH2 = true,
        includeH3 = true,
        minSubscriptDepth = 1,
        maxSubscriptDepth = 3,
        filterPattern = null
    } = options;
    
    const subsections = [];
    
    // Collect all heading matches
    const allHeadings = [];
    
    if (includeH2) {
        const h2Matches = content.match(/<h2[^>]*id="[^"]*">([^<]*)<\/h2>/g);
        if (h2Matches) {
            allHeadings.push(...h2Matches.map(match => ({
                type: 'h2',
                match: match,
                title: match.replace(/<h2[^>]*>([^<]*)<\/h2>/, '$1'),
                level: 2
            })));
        }
    }
    
    if (includeH3) {
        const h3Matches = content.match(/<h3[^>]*id="[^"]*">([^<]*)<\/h3>/g);
        if (h3Matches) {
            allHeadings.push(...h3Matches.map(match => ({
                type: 'h3',
                match: match,
                title: match.replace(/<h3[^>]*>([^<]*)<\/h3>/, '$1'),
                level: 3
            })));
        }
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
        
        // Enhanced subscript pattern matching
        const subscriptMatch = heading.title.match(/(\d+(?:\.\d+)*)/);
        
        if (subscriptMatch) {
            const subscript = subscriptMatch[1];
            const depth = subscript.split('.').length;
            
            // Check depth constraints
            if (depth < minSubscriptDepth || depth > maxSubscriptDepth) {
                continue;
            }
            
            // Apply filter pattern if specified
            if (filterPattern && !subscript.match(filterPattern)) {
                continue;
            }
            
            const cleanTitle = heading.title.replace(subscript, '').trim();
            
            subsections.push({
                id: `subsection-${subscript.replace(/\./g, '-')}`,
                number: subscript,
                title: cleanTitle,
                fullTitle: heading.title,
                type: heading.type,
                level: heading.level,
                depth: depth,
                content: subsectionContent
            });
        }
    }
    
    return subsections;
}

// Function to process chapters with advanced options
function makeChaptersGranularAdvanced(chapters, options = {}) {
    const {
        includeOriginalChapters = true,
        includeSubsections = true,
        subsectionOptions = {},
        outputFormat = 'combined'
    } = options;
    
    const granularChapters = [];
    const subsectionsOnly = [];
    const chaptersOnly = [];
    
    chapters.forEach(chapter => {
        // Add original chapter if requested
        if (includeOriginalChapters) {
            const chapterEntry = {
                ...chapter,
                granularType: 'chapter'
            };
            granularChapters.push(chapterEntry);
            chaptersOnly.push(chapterEntry);
        }
        
        // Extract and add subsections if requested
        if (includeSubsections) {
            const subsections = extractSubsectionsAdvanced(chapter.content, subsectionOptions);
            
            subsections.forEach(subsection => {
                const subsectionEntry = {
                    ...subsection,
                    parentChapter: chapter.id,
                    parentNumber: chapter.number,
                    granularType: 'subsection'
                };
                granularChapters.push(subsectionEntry);
                subsectionsOnly.push(subsectionEntry);
            });
        }
    });
    
    // Return based on output format
    switch (outputFormat) {
        case 'combined':
            return granularChapters;
        case 'subsections-only':
            return subsectionsOnly;
        case 'chapters-only':
            return chaptersOnly;
        case 'separated':
            return {
                chapters: chaptersOnly,
                subsections: subsectionsOnly,
                combined: granularChapters
            };
        default:
            return granularChapters;
    }
}

// Function to generate statistics
function generateStatistics(granularChapters) {
    const chapters = granularChapters.filter(ch => ch.granularType === 'chapter');
    const subsections = granularChapters.filter(ch => ch.granularType === 'subsection');
    
    const h2Subsections = subsections.filter(sub => sub.type === 'h2');
    const h3Subsections = subsections.filter(sub => sub.type === 'h3');
    
    // Analyze depth distribution
    const depthStats = {};
    subsections.forEach(sub => {
        const depth = sub.depth || 1;
        depthStats[depth] = (depthStats[depth] || 0) + 1;
    });
    
    // Analyze parent chapter distribution
    const parentStats = {};
    subsections.forEach(sub => {
        const parent = sub.parentNumber;
        parentStats[parent] = (parentStats[parent] || 0) + 1;
    });
    
    return {
        totalEntries: granularChapters.length,
        originalChapters: chapters.length,
        totalSubsections: subsections.length,
        h2Subsections: h2Subsections.length,
        h3Subsections: h3Subsections.length,
        depthDistribution: depthStats,
        parentChapterDistribution: parentStats
    };
}

// Main function with command line options
function main() {
    const args = process.argv.slice(2);
    const options = {
        includeOriginalChapters: true,
        includeSubsections: true,
        subsectionOptions: {
            includeH2: true,
            includeH3: true,
            minSubscriptDepth: 1,
            maxSubscriptDepth: 3
        },
        outputFormat: 'combined'
    };
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--subsections-only':
                options.includeOriginalChapters = false;
                options.outputFormat = 'subsections-only';
                break;
            case '--chapters-only':
                options.includeSubsections = false;
                options.outputFormat = 'chapters-only';
                break;
            case '--separated':
                options.outputFormat = 'separated';
                break;
            case '--min-depth':
                options.subsectionOptions.minSubscriptDepth = parseInt(args[++i]);
                break;
            case '--max-depth':
                options.subsectionOptions.maxSubscriptDepth = parseInt(args[++i]);
                break;
            case '--no-h2':
                options.subsectionOptions.includeH2 = false;
                break;
            case '--no-h3':
                options.subsectionOptions.includeH3 = false;
                break;
            case '--filter':
                options.subsectionOptions.filterPattern = new RegExp(args[++i]);
                break;
            case '--help':
                console.log(`
Usage: node make_chapters_granular_advanced.js [options]

Options:
  --subsections-only     Output only subsections
  --chapters-only        Output only original chapters
  --separated            Output separate files for chapters and subsections
  --min-depth <n>        Minimum subscript depth (default: 1)
  --max-depth <n>        Maximum subscript depth (default: 3)
  --no-h2                Exclude H2 headings
  --no-h3                Exclude H3 headings
  --filter <pattern>     Filter subsections by regex pattern
  --help                 Show this help message

Examples:
  node make_chapters_granular_advanced.js
  node make_chapters_granular_advanced.js --subsections-only
  node make_chapters_granular_advanced.js --min-depth 2 --max-depth 2
  node make_chapters_granular_advanced.js --filter "1\\..*"
                `);
                return;
        }
    }
    
    try {
        // Read the original chapters.json file
        const chaptersPath = path.join(__dirname, '../frontend/src/data/chapters.json');
        const chapters = JSON.parse(fs.readFileSync(chaptersPath, 'utf8'));
        
        console.log(`Processing ${chapters.length} chapters with options:`, options);
        
        // Make chapters more granular
        const result = makeChaptersGranularAdvanced(chapters, options);
        
        // Generate statistics
        const stats = generateStatistics(Array.isArray(result) ? result : result.combined);
        
        console.log('\n=== Statistics ===');
        console.log(`Total entries: ${stats.totalEntries}`);
        console.log(`Original chapters: ${stats.originalChapters}`);
        console.log(`Total subsections: ${stats.totalSubsections}`);
        console.log(`H2 subsections: ${stats.h2Subsections}`);
        console.log(`H3 subsections: ${stats.h3Subsections}`);
        console.log(`Depth distribution:`, stats.depthDistribution);
        
        // Write output based on format
        if (options.outputFormat === 'separated') {
            const basePath = path.join(__dirname, '../frontend/src/data');
            fs.writeFileSync(path.join(basePath, 'chapters_granular_chapters.json'), 
                JSON.stringify(result.chapters, null, 2));
            fs.writeFileSync(path.join(basePath, 'chapters_granular_subsections.json'), 
                JSON.stringify(result.subsections, null, 2));
            fs.writeFileSync(path.join(basePath, 'chapters_granular_combined.json'), 
                JSON.stringify(result.combined, null, 2));
            console.log('\nFiles saved:');
            console.log('  chapters_granular_chapters.json');
            console.log('  chapters_granular_subsections.json');
            console.log('  chapters_granular_combined.json');
        } else {
            const filename = options.outputFormat === 'combined' 
                ? 'chapters_granular.json' 
                : `chapters_granular_${options.outputFormat}.json`;
            const outputPath = path.join(__dirname, `../frontend/src/data/${filename}`);
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            console.log(`\nOutput saved to: ${outputPath}`);
        }
        
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
    makeChaptersGranularAdvanced,
    extractSubsectionsAdvanced,
    generateStatistics
}; 