import { PromptTemplate } from "@langchain/core/prompts";
import { getLanguageSpecificRequirements } from "../solutionGen/prompt.mjs"; // Re-use for recursion limits etc.

/**
 * Prompt template for Start Code Generation step.
 */
export const startCodeGenerationPromptTemplate = PromptTemplate.fromTemplate(
`You are an expert in generating starter code templates for programming problems in various languages.
Your task is to create a clear and correct starting template for a function named "solution" in the specified {language}.

Target Language: {language}

Problem Input Schema:
{input_schema_description}

Problem Output Format Description:
{output_format_description}

Validated Solution Code Snippet (for reference on I/O structure and function signature, DO NOT COPY LOGIC):
\`\`\`{language}
{solution_code_snippet}
\`\`\`

Constraints (for context, especially for data types or limits that might affect boilerplate):
{constraints_json}

Instructions:
1.  Create a function definition for a function named EXACTLY \`solution\`.
2.  The \`solution\` function must accept parameters that EXACTLY match the \`Problem Input Schema\`.
    - Pay close attention to the structure (e.g., single object, multiple arguments, specific field names if the input is an object).
    - If the input is a single object, the function should accept that object (e.g., \`def solution(data):\`). You can show how to access its parts within the function body if helpful (e.g., \`arr = data['arr']\`).
    - If the input schema describes multiple distinct top-level inputs (e.g., an array \`arr\` and an integer \`n\`), the function should accept these as separate arguments (e.g., \`def solution(arr, n):\`).
3.  The \`solution\` function should be set up to return a value consistent with the \`Problem Output Format Description\`.
    - Include a placeholder return statement with a basic, type-appropriate default value (e.g., \`return [];\`, \`return 0;\`, \`return "";\`, \`return {{}};\`).
4.  The generated code should ONLY be the function definition and any necessary imports.
5.  DO NOT include any problem-solving logic. This is a template for the user to fill in.
6.  Ensure the code is syntactically correct for the {language}.
7.  Include language-specific best practices for competitive programming if applicable (e.g., recursion limits for Python).
    {language_specific_requirements}
8.  Refer to the \`Problem Input Schema\` and the \`Validated Solution Code Snippet\` to determine the correct parameter structure for the \`solution\` function.
9.  For Python code, ALWAYS include clear type hints **using built‑in generics**:
    - Use \`list[int]\`, \`dict[str, any]\`, \`tuple[int, str]\` etc. for complex types.
    - **Do NOT import** the \`typing\` module unless \`TypeVar\`, \`Callable\` or other special types are needed and the solution code is already using it.
    - Be specific with collection contents (e.g., use \`list[int]\` instead of just \`list\`).
    - Include return type hints to make expected output format clear.
    - Pay special attention to nested structures and correctly represent them (e.g., \`list[list[int]]\` for a matrix).

Example for Python if input is \`{{"nums": [1,2,3], "k": 2}}\` (assuming schema indicates a single object):
\`\`\`python
import sys

# If using recursion, uncomment the following line:
# sys.setrecursionlimit(300000)

def solution(data: dict[str, any]) -> int:
    nums: list[int] = data["nums"]
    k: int = data["k"]
    
    # Your amazing code here
    result: int = 0  # Placeholder
    
    return result
\`\`\`

Example for Python if input schema implies two separate arguments \`arr\` (list) and \`n\` (int):
\`\`\`python
import sys

# If using recursion, uncomment the following line:
# sys.setrecursionlimit(300000)

def solution(arr: list[int], n: int) -> list[int]:
    # arr is a list of integers
    # n is an integer
    
    # Your amazing code here
    result: list[int] = []  # Placeholder
    
    return result
\`\`\`

**CRITICAL:** Output **ONLY** the raw source code for the start code template. Do not include explanations, comments *about* the code (docstrings within the function are fine if idiomatic), markdown formatting (like \`\`\`{language}\`), or any other text.

{language} Start Code Template:
`); 