import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Test Design step.
 * Updated in v3 to only generate inputs and rationales, not expected outputs.
 */
export const testDesignPromptTemplate = PromptTemplate.fromTemplate(
  `
You are "TestDesigner", an expert at designing test cases for programming problems.  
Use the INTENT object below to draft test cases with diverse inputs and clear rationales.

INTENT_JSON:
{intent_json}

Input Schema: {input_schema_description}
{feedback_section}

Guidelines:
1. Create 8-12 diverse test cases covering: empty inputs, single elements, typical cases, sorted (ascending/descending), 
   boundary values, and edge cases appropriate for {difficulty} level.
   **If the Input Schema indicates that inputs can contain duplicates (e.g., \`[1, 5, 2, 5]\`) or involve repeated structures (e.g., paths in a graph \`A->B->A->C\`), ensure your test cases explicitly include such scenarios.**
2. Each test must include a short "rationale" explaining *why* it is included.
   - For test cases involving duplicate elements, ALWAYS include words like "duplicate", "repeated", or "same element" in the rationale.
   - For test cases involving paths that revisit nodes, ALWAYS include words like "cycle", "revisit", or "repeated node" in the rationale.
3. Focus ONLY on designing the INPUT values. DO NOT try to compute or predict outputs.
4. The outputs will be determined by executing a validated solution code later.
5. Include inputs that test different aspects of the problem (edge cases, performance, etc.).
6. IMPORTANT: All values MUST be valid JSON literals.  
   - DO NOT use code expressions like list(range(1000)), **Python list comprehensions ([i, i+1] for i in range(99))**, or "..." ellipses.
   - DO NOT use variables, loops, or any programming language constructs.
   - If you need a long sequence, enumerate **every element explicitly**, e.g.  
     RIGHT: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
   - For large graphs or arrays, provide the complete explicit representation:
     RIGHT: "edges": [[0,1],[1,2],[2,3],[3,4],[4,5]]
     WRONG: "edges": [[i, i+1] for i in range(5)]
7. CRITICAL: All input values MUST follow the input schema defined above. Ensure your test cases match the expected structure exactly.
8. When creating large test cases with many elements, ALWAYS write out each element explicitly in valid JSON syntax (no shortcuts, no ellipses, no code).
9. **CRITICAL: All generated input values MUST STRICTLY adhere to any constraints defined in the \`input_schema_description\` and any \`key_constraints\` found in the \`INTENT_JSON\`. DO NOT generate inputs that violate these constraints (e.g., string length, number ranges). If the intent mentions a maximum string length of 1000, do not create a test case with a 1500-character string.**
10. **AVOID REPETITION: Each test case must be UNIQUE. Do not create duplicate or nearly identical test cases. Each input should test a DIFFERENT scenario.**
11. **JSON SAFETY: Ensure all string inputs use proper JSON escaping. Use double quotes for all property names and string values. Avoid unescaped special characters.**
12. **CONCISE OUTPUT: Generate exactly 8-12 test cases. Do not exceed this limit. Stop generation once you have sufficient diverse test cases.**

Target difficulty level: {difficulty}

Return JSON array (EXACTLY 8-12 items, NO MORE):
[
  {{
    "input": any,          // Input value (must be valid JSON, not code expressions)
    "rationale": string    // Reason why this case is needed (edge case, performance, special condition, etc.)
  }},
  ...
]

Few-shot examples (for an array sum problem):
1. {{ "input": [], "rationale": "Empty array edge case" }}
2. {{ "input": [5], "rationale": "Single element case" }}
3. {{ "input": [1, 2, 3, 4, 5], "rationale": "Sequential numbers" }}
4. {{ "input": [-10, 5, -3, 8], "rationale": "Mix of positive and negative numbers" }}
5. {{ "input": [2, 2, 2], "rationale": "Array with duplicate elements (same value repeated)" }}
6. WRONG: {{ "input": list(range(100)), "rationale": "Large sequence" }} // DON'T DO THIS - not valid JSON
7. WRONG: {{ "input": [i for i in range(10)], "rationale": "List comprehension" }} // DON'T DO THIS - not valid JSON
8. RIGHT: {{ "input": [0,1,2,3,4,5,6,7,8,9,10], "rationale": "Long sequence fully enumerated" }}

Few-shot examples (for a graph problem):
1. RIGHT: {{ "input": {{"n": 5, "edges": [[0,1],[1,2],[2,3],[3,4]]}}, "rationale": "Simple path graph" }}
2. RIGHT: {{ "input": {{"n": 6, "edges": [[0,1],[1,2],[0,3],[3,4],[4,5]]}}, "rationale": "Graph with two paths" }}
3. WRONG: {{ "input": {{"n": 100, "edges": [[i, i+1] for i in range(99)]}}, "rationale": "Long path" }} // DON'T DO THIS - not valid JSON
4. RIGHT: {{ "input": {{"n": 5, "edges": [[0,1],[1,2],[2,3],[3,4]]}}, "rationale": "Graph forming a single path" }}

**CRITICAL:** 
- Ensure the entire output is a single, complete, valid JSON array starting with \`[\` and ending correctly with \`]\`.
- Generate EXACTLY 8-12 unique test cases, then STOP.
- Do not truncate the output.
- Do not repeat test cases.
- Ensure proper JSON formatting with double quotes for all strings.

{format_instructions}

ONLY return a valid JSON array. Never use programming language constructs like list comprehensions, loops, or variables.`
);