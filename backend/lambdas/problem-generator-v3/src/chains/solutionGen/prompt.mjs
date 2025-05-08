import { PromptTemplate } from "@langchain/core/prompts";

/**
 * Prompt template for Solution Generation step.
 */
export const solutionGenerationPromptTemplate = PromptTemplate.fromTemplate(
  `
Generate the solution code in {language} for the following problem intent and test specifications.

Problem Goal:
{analyzed_intent}

Tie-Breaking Rule (if applicable):
{tie_breaking_rule}

Input Schema:
{input_schema_description}

Test Specifications:
{test_specs}

Requirements:
- The code must be correct and aim to pass all the specified test cases.
- **If the problem definition (within problem goal or tie-breaking rule) specifies a rule for cases with multiple valid outputs, your solution MUST implement this rule precisely.**
{feedback_section}

- **CRITICAL:** The main logic must be encapsulated within a function named exactly *solution* that accepts a single argument representing the problem input.
- The solution function must accept input in the exact format specified in the Input Schema above, **paying close attention to whether duplicate elements or repeated structures are allowed and how they are represented.**
- The solution function must handle edge cases appropriately, especially:
  - Empty inputs (e.g., empty arrays, empty strings)
  - Minimum/maximum values
  - Corner cases mentioned in the test specifications
- The solution function must return output in a consistent, JSON-serializable format where:
  - Dictionary/Map keys should be strings (not numbers or other types)
  - For special values, use string representations: "Infinity" (not float('inf')), "-Infinity", "NaN"
- The code should be efficient and follow standard coding practices for {language}.
- Adhere strictly to {language} syntax and standard libraries.
{language_specific_requirements}

**CRITICAL:** Output **ONLY** the raw source code for the solution. Do not include explanations, comments about the code, markdown formatting (like \`\`\`python), or any other text.

{language} Solution Code:`
);

/**
 * Returns language-specific requirements for the solution generation prompt
 * 
 * @param {string} language Programming language
 * @returns {string} Language-specific requirements to add to the prompt
 */
export function getLanguageSpecificRequirements(language) {
  const lang = language.toLowerCase();
  
  if (lang.includes('python')) {
    return `
- For Python:
  - Use Python standard libraries only.
  - Handle empty input cases appropriately (e.g., avoid raising exceptions on empty lists).
  - Ensure return values are properly formatted (e.g., use None instead of null, etc.).
  - Follow PEP 8 style guidelines.`;
  }
  
  if (lang.includes('javascript') || lang.includes('js')) {
    return `
- For JavaScript:
  - Use standard ES6+ features.
  - Ensure compatibility with Node.js environment.
  - Handle edge cases like empty arrays and objects appropriately.
  - Use console.log only if required for the solution output.`;
  }
  
  if (lang.includes('java')) {
    return `
- For Java:
  - Create a complete class with the solution method.
  - Use standard Java libraries only.
  - Handle edge cases appropriately with proper exception handling if needed.
  - Use efficient data structures and algorithms.`;
  }
  
  if (lang.includes('c++') || lang.includes('cpp')) {
    return `
- For C++:
  - Use standard C++11 or later features.
  - Include necessary headers.
  - Handle memory management appropriately.
  - Ensure proper handling of edge cases.`;
  }
  
  // Default case
  return '';
} 