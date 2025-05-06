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

Guidelines:
1. Create diverse test cases covering: empty inputs, single elements, typical cases, sorted (ascending/descending), 
   boundary values, and edge cases appropriate for {difficulty} level.
   **If the Input Schema indicates that inputs can contain duplicates (e.g., \`[1, 5, 2, 5]\`) or involve repeated structures (e.g., paths in a graph \`A->B->A->C\`), ensure your test cases explicitly include such scenarios.**
2. Each test must include a short "rationale" explaining *why* it is included.
   - For test cases involving duplicate elements, ALWAYS include words like "duplicate", "repeated", or "same element" in the rationale.
   - For test cases involving paths that revisit nodes, ALWAYS include words like "cycle", "revisit", or "repeated node" in the rationale.
3. Focus ONLY on designing the INPUT values. DO NOT try to compute or predict outputs.
4. The outputs will be determined by executing a validated solution code later.
5. Include inputs that test different aspects of the problem (edge cases, performance, etc.).
6. IMPORTANT: All values MUST be valid JSON literals.  
   DO NOT use code expressions like list(range(1000)) **or "..." ellipses**.  
   If you need a long sequence, enumerate **every element explicitly**, e.g.  
   RIGHT: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
7. CRITICAL: All input values MUST follow the input schema defined above. Ensure your test cases match the expected structure exactly.

Target difficulty level: {difficulty}

Return JSON array:
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
7. RIGHT: {{ "input": [0,1,2,3,4,5,6,7,8,9,10], "rationale": "Long sequence fully enumerated" }}

Few-shot examples (for a graph problem - just to illustrate format, adapt to your problem type):
1. Example with a simple path: Input would contain a graph structure with nodes, edges and start/end points.
2. Example with multiple paths: Input would contain a more complex graph structure offering different route options.
3. Example with a cycle: If applicable, input would contain a graph with edges that form a cycle.

{format_instructions}

ONLY return a valid JSON array.`
); 