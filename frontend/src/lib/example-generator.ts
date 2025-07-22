
// Kx Reference Card content
export const generateKdbExamples = () => [
  {
    category: 'Arithmetic & Math',
    items: [
      {
        q: 'Basic Arithmetic: + - * %',
        doc: 'Add, subtract, multiply, divide'
      },
      {
        q: 'Mathematical Functions: abs neg sqrt exp log',
        doc: 'Absolute value, negate, square root, exponential, logarithm'
      },
      {
        q: 'Trigonometric: sin cos tan asin acos atan',
        doc: 'Sine, cosine, tangent and their inverse functions'
      },
      {
        q: 'Number Manipulation: floor ceiling mod div',
        doc: 'Floor, ceiling, modulo, integer division'
      },
      {
        q: 'Aggregation: sum avg max min',
        doc: 'Sum, average, maximum, minimum'
      },
      {
        q: 'Running Operations: prd prds sums',
        doc: 'Product, running products, running sums'
      },
      {
        q: 'Statistics: var dev sdev cor cov',
        doc: 'Variance, deviation, standard deviation, correlation, covariance'
      },
      {
        q: 'Random & Sequences: rand til',
        doc: 'Random number generation and integer sequences'
      }
    ],
  },
  {
    category: 'Comparison & Logic',
    items: [
      {
        q: 'Equality: = <> ~',
        doc: 'Equals, not equals, match'
      },
      {
        q: 'Relational: < <= > >=',
        doc: 'Less than, less/equal, greater than, greater/equal'
      },
      {
        q: 'Logical Aggregation: all any',
        doc: 'All true, any true'
      },
      {
        q: 'Logical Operators: and or not',
        doc: 'And, or, not'
      },
      {
        q: 'Bitwise & Vector: & |',
        doc: 'Bitwise and vector operations'
      },
      {
        q: 'Membership: in within',
        doc: 'Test if value is in list or within range'
      },
      {
        q: 'Pattern Matching: like',
        doc: 'Pattern matching with wildcards'
      }
    ],
  },
  {
    category: 'List Operations',
    items: [
      {
        q: 'Count & Take: count #',
        doc: 'Count elements or take n elements'
      },
      {
        q: 'First & Last: first last',
        doc: 'Get first or last element'
      },
      {
        q: 'List Reordering: reverse rotate',
        doc: 'Reverse list or rotate elements'
      },
      {
        q: 'List Flattening: raze enlist',
        doc: 'Flatten nested lists or create single-item list'
      },
      {
        q: 'Unique & Group: distinct group',
        doc: 'Get unique values or group by value'
      },
      {
        q: 'Conditional Indices: where',
        doc: 'Find indices where condition is true'
      },
      {
        q: 'List Cutting: cut _',
        doc: 'Cut list at positions or drop elements'
      },
      {
        q: 'Cartesian Product: cross',
        doc: 'Cartesian product of lists'
      },
      {
        q: 'Set Operations: inter except union',
        doc: 'Intersection, difference, union'
      },
      {
        q: 'Subset Extraction: sublist',
        doc: 'Extract sublist from position with length'
      }
    ],
  },
  {
    category: 'Sorting & Ranking',
    items: [
      {
        q: 'Sorting: asc desc',
        doc: 'Sort ascending or descending'
      },
      {
        q: 'Sort Indices: iasc idesc',
        doc: 'Get indices for ascending/descending sort'
      },
      {
        q: 'Ranking: rank',
        doc: 'Rank elements (0 for smallest)'
      },
      {
        q: 'Consistent Ranking: xrank',
        doc: 'Rank with ties handled consistently'
      },
      {
        q: 'Binary Search: bin binr',
        doc: 'Binary search in sorted list'
      },
      {
        q: 'Rounding: xbar',
        doc: 'Round down to nearest multiple'
      }
    ],
  },
  {
    category: 'Table & Dictionary',
    items: [
      {
        q: 'Data Selection: select',
        doc: 'Select columns/rows from table'
      },
      {
        q: 'Data Update: update',
        doc: 'Update columns in table'
      },
      {
        q: 'Data Deletion: delete',
        doc: 'Delete columns/rows from table'
      },
      {
        q: 'Query Execution: exec',
        doc: 'Execute query and return result'
      },
      {
        q: 'Data Insertion: insert upsert',
        doc: 'Insert rows or upsert (insert/update)'
      },
      {
        q: 'Key Operations: key keys',
        doc: 'Get keys from dictionary or make keyed table'
      },
      {
        q: 'Column Names: cols',
        doc: 'Get column names from table'
      },
      {
        q: 'Table Metadata: meta',
        doc: 'Get table metadata (columns, types, etc.)'
      },
      {
        q: 'Table Transpose: flip',
        doc: 'Transpose table/matrix'
      },
      {
        q: 'Ungroup Columns: ungroup',
        doc: 'Ungroup nested columns'
      }
    ],
  },
  {
    category: 'Joins',
    items: [
      {
        q: 'Left Join: lj ljf',
        doc: 'Left join tables'
      },
      {
        q: 'Inner Join: ij ijf',
        doc: 'Inner join tables'
      },
      {
        q: 'Union Join: uj ujf',
        doc: 'Union join tables'
      },
      {
        q: 'Plus Join: pj',
        doc: 'Plus join (add matching values)'
      },
      {
        q: 'As-of Join: aj aj0',
        doc: 'As-of join (temporal join)'
      },
      {
        q: 'Window Join: wj wj1',
        doc: 'Window join with time windows'
      },
      {
        q: 'As-of Search: asof',
        doc: 'As-of search in sorted list'
      }
    ],
  },
  {
    category: 'String & Symbol',
    items: [
      {
        q: 'String Conversion: string',
        doc: 'Convert to string representation'
      },
      {
        q: 'Case Conversion: upper lower',
        doc: 'Convert to uppercase/lowercase'
      },
      {
        q: 'Whitespace Removal: trim ltrim rtrim',
        doc: 'Remove whitespace from ends'
      },
      {
        q: 'String Search: ss ssr',
        doc: 'String search and string search/replace'
      },
      {
        q: 'Vector Scalar: vs sv',
        doc: 'Vector from scalar, scalar from vector'
      },
      {
        q: 'Hash Function: md5',
        doc: 'MD5 hash of string'
      }
    ],
  },
  {
    category: 'Type & Cast',
    items: [
      {
        q: 'Type Detection: type',
        doc: 'Get type number of value'
      },
      {
        q: 'Numeric Types: `boolean`byte`short`int`long`real`float',
        doc: 'Numeric types for casting'
      },
      {
        q: 'Text & Temporal: `char`symbol`timestamp`date`time',
        doc: 'Text and temporal types'
      },
      {
        q: 'Type Casting: $',
        doc: 'Cast between types or format'
      },
      {
        q: 'Null Testing: null',
        doc: 'Test for null values'
      },
      {
        q: 'List Attributes: attr',
        doc: 'Get/set list attributes (sorted, unique, etc.)'
      }
    ],
  },
  {
    category: 'I/O & Files',
    items: [
      {
        q: 'File Reading: read0 read1',
        doc: 'Read text file or binary file'
      },
      {
        q: 'Data Persistence: save load',
        doc: 'Save/load q data files'
      },
      {
        q: 'Directory Save: dsave',
        doc: 'Save data in directory format'
      },
      {
        q: 'Variable Access: get set',
        doc: 'Get/set file contents or variables'
      },
      {
        q: 'Handle Management: hopen hclose',
        doc: 'Open/close file or connection handle'
      },
      {
        q: 'File Symbol: hsym',
        doc: 'Convert to file symbol'
      },
      {
        q: 'CSV Parsing: csv',
        doc: 'Parse CSV format'
      }
    ],
  },
  {
    category: 'Control Flow',
    items: [
      {
        q: 'Conditional: if',
        doc: 'Conditional execution'
      },
      {
        q: 'Loop: while',
        doc: 'Loop while condition is true'
      },
      {
        q: 'Repeat: do',
        doc: 'Execute expression n times'
      },
      {
        q: 'Conditional Expression: $[;;]',
        doc: 'Conditional expression (if-then-else)'
      },
      {
        q: 'Error Trapping: .[;;]',
        doc: 'Trap errors in expression'
      },
      {
        q: 'At Error Trapping: @[;;]',
        doc: 'Trap errors with @ syntax'
      },
      {
        q: 'Exit: exit',
        doc: 'Exit function or program'
      }
    ],
  },
  {
    category: 'Iterators',
    items: [
      {
        q: 'Each Iterator: each \'',
        doc: 'Apply function to each element'
      },
      {
        q: 'Over Iterator: over /',
        doc: 'Reduce/fold over list'
      },
      {
        q: 'Scan Iterator: scan \\',
        doc: 'Running totals/accumulation'
      },
      {
        q: 'Prior Iterator: prior \':',
        doc: 'Apply with previous value'
      },
      {
        q: 'Parallel Each: peach \':',
        doc: 'Parallel each'
      },
      {
        q: 'Each Left: each-left \\:',
        doc: 'Each element on left with right'
      },
      {
        q: 'Each Right: each-right /:',
        doc: 'Left with each element on right'
      }
    ],
  },
  {
    category: 'Interactive Coordinate Examples',
    items: [
      {
        q: '10 10#til[100]*mouseX*mouseY',
        doc: 'Interactive 10x10 grid based on coordinates'
      },
      {
        q: 'til[20]*mouseX+mouseY',
        doc: 'Dynamic list that changes with coordinates'
      },
      {
        q: '([]x:til 50; y:(til 50)*mouseX; color:(til 50)*mouseY)',
        doc: 'Interactive table with coordinate-driven columns'
      },
      {
        q: '3 3#(9*mouseX*mouseY)+til 9',
        doc: 'Simple 3x3 grayscale image controlled by coordinates'
      },
      {
        q: 'mouseX*100',
        doc: 'X coordinate scaled to 0-100'
      },
      {
        q: '(mouseX;mouseY)',
        doc: 'Show current coordinates'
      }
    ],
  },
  {
    category: 'System',
    items: [
      {
        q: 'Load Script: \\l',
        doc: 'Load script file'
      },
      {
        q: 'Change Namespace: \\d',
        doc: 'Change namespace'
      },
      {
        q: 'Show Objects: \\v \\f \\a',
        doc: 'Show variables, functions, tables'
      },
      {
        q: 'Timing: \\t \\ts',
        doc: 'Timer, time and space'
      },
      {
        q: 'Set Port: \\p',
        doc: 'Set port for connections'
      },
      {
        q: 'Memory Usage: \\w',
        doc: 'Memory usage'
      },
      {
        q: 'Console Size: \\c',
        doc: 'Console size'
      },
      {
        q: 'Change Directory: \\cd',
        doc: 'Change directory'
      },
      {
        q: 'Exit Commands: \\ \\\\',
        doc: 'Exit to k, quit q'
      }
    ],
  }
];