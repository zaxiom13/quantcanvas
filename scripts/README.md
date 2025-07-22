# Chapter Granularization Scripts

This directory contains scripts for making the chapters JSON even more granular by extracting subsections based on subscript patterns like "1.19", "0.2.1", etc.

## Scripts

### `make_chapters_granular.js`

This script processes the original `chapters.json` file and creates a more granular version by:

1. **Extracting Subsections**: Looks for H2 and H3 headings in the HTML content that contain subscript patterns (e.g., "1.19", "0.2.1")
2. **Creating Granular Structure**: Each subsection becomes its own entry with:
   - Unique ID based on the subscript
   - Parent chapter reference
   - Granular type classification
   - Extracted content from that section

3. **Output**: Creates `chapters_granular.json` with both original chapters and subsections

### `examine_granular.js`

A utility script to examine the structure and statistics of the granular chapters file.

## Usage

```bash
# Make chapters granular
node scripts/make_chapters_granular.js

# Examine the results
node scripts/examine_granular.js
```

## Output Structure

The granular chapters file contains entries with the following structure:

### Original Chapters
```json
{
  "id": "chapter-0",
  "number": "0",
  "title": "Overview",
  "fullTitle": "0. Overview",
  "content": "...",
  "granularType": "chapter"
}
```

### Subsections
```json
{
  "id": "subsection-0-2-1",
  "number": "0.2.1",
  "title": "2.1 Variables",
  "fullTitle": "0.2.1 Variables",
  "type": "h3",
  "content": "...",
  "parentChapter": "chapter-0",
  "parentNumber": "0",
  "granularType": "subsection"
}
```

## Statistics

From the latest run:
- **Original chapters**: 20
- **H2 subsections**: 120
- **H3 subsections**: 291
- **Total granular entries**: 431

## Subscript Patterns

The script recognizes patterns like:
- `0.0` - Chapter 0, Section 0
- `1.19` - Chapter 1, Section 19
- `0.2.1` - Chapter 0, Section 2, Subsection 1
- `10.10.1.1` - Chapter 10, Section 10, Subsection 1, Sub-subsection 1

## Benefits

1. **Finer Navigation**: Users can navigate to specific subsections rather than entire chapters
2. **Better Search**: More granular content allows for more precise search results
3. **Improved UX**: Smaller, focused content chunks are easier to digest
4. **Hierarchical Structure**: Maintains parent-child relationships between chapters and subsections

## Files

- `frontend/src/data/chapters.json` - Original chapters file
- `frontend/src/data/chapters_granular.json` - Generated granular chapters file 