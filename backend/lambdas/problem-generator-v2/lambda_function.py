import json
import sys
import os
import time
import uuid
import traceback
import boto3

# from langchain_aws import BedrockLLM
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from pydantic import BaseModel, Field
from typing import List, Union

# Initialize AWS clients
bedrock_runtime = boto3.client(service_name="bedrock-runtime")
dynamodb = boto3.resource("dynamodb")

# Environment Variables
PROBLEMS_TABLE_NAME = os.environ.get("PROBLEMS_TABLE_NAME", "default-problems-table")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID")  # Get Bedrock model ID
GOOGLE_AI_API_KEY = os.environ.get("GOOGLE_AI_API_KEY")  # Get Google API Key
GENERATOR_VERBOSE = os.environ.get("GENERATOR_VERBOSE", "false").lower() == "true"

# Constants
DEFAULT_LANGUAGE = "python3.12"

# Initialize LLM based on available configuration
llm = None
if GOOGLE_AI_API_KEY:
    print("Using Google AI (Gemini)")
    # Ensure langchain-google-genai is installed
    from langchain_google_genai import ChatGoogleGenerativeAI

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro-exp-03-25",  # Consider making model name configurable
        google_api_key=GOOGLE_AI_API_KEY,
        # Add temperature or other generation settings if needed
    )
# elif BEDROCK_MODEL_ID:
#     print(f"Using AWS Bedrock ({BEDROCK_MODEL_ID})")
#     bedrock_runtime = boto3.client(service_name="bedrock-runtime")
#     llm = BedrockLLM(
#         client=bedrock_runtime,
#         model_id=BEDROCK_MODEL_ID,
#         model_kwargs={"max_tokens_to_sample": 2048},  # Adjusted based on Bedrock needs
#     )
# else:
#     raise ValueError(
#         "No LLM provider configured. Set GOOGLE_AI_API_KEY or BEDROCK_MODEL_ID environment variables."
#     )

# --- Pydantic Models for Structured Output ---


class IntentAnalysisOutput(BaseModel):
    """Structured output for Step 1: Intent Analysis & Test Case Design."""

    analyzed_intent: str = Field(
        description="Concise description of the core algorithm, data structure, or concept."
    )
    # Allow string for flexibility if LLM generates complex specs not easily fitting array of objects
    test_specs: Union[List[dict], str] = Field(
        description="Diverse set of test cases (e.g., array of objects with 'input' and 'expected_output', or a descriptive string)"
    )


class ValidationOutput(BaseModel):
    """Structured output for Step 4: LLM-Based Validation."""

    status: str = Field(description='"Pass" or "Fail"')
    details: str = Field(
        description="Brief explanation of findings, especially on failure."
    )


class ConstraintsOutput(BaseModel):
    """Structured output for Step 5: Constraints Derivation."""

    time_limit_seconds: float = Field(
        description="Estimated reasonable time limit in seconds."
    )
    memory_limit_mb: int = Field(description="Estimated reasonable memory limit in MB.")
    input_constraints: str = Field(
        description="Clear constraints on input values (range, length, format)."
    )


# --- LangChain Prompts & Chains ---

# Step 1: Intent Analysis & Test Case Design
intent_analysis_parser = PydanticOutputParser(pydantic_object=IntentAnalysisOutput)

intent_analysis_prompt_template = PromptTemplate(
    input_variables=["user_prompt", "difficulty", "language"],
    partial_variables={
        "format_instructions": intent_analysis_parser.get_format_instructions()
    },  # Use parser instructions
    template="""
Analyze the following user request for a coding problem and design test cases.

User Prompt: {user_prompt}
Difficulty: {difficulty}
Target Language: {language}

1.  **Intent Analysis:** Concisely describe the core algorithm, data structure, or concept. Identify key elements and constraints implied by the prompt and difficulty.
2.  **Test Case Design:** Design a diverse set of test cases (inputs and expected outputs or validation logic) appropriate for the **{difficulty}** level. Include typical cases, edge cases (empty inputs, single elements, large inputs if applicable, duplicates, specific value ranges), and potentially performance-related cases if relevant to the difficulty.

{format_instructions} # Inject format instructions

Valid JSON Output:
""",
)

# Use LCEL
intent_analysis_chain = intent_analysis_prompt_template | llm | intent_analysis_parser

# Step 2: Solution Code Generation
solution_generation_prompt_template = PromptTemplate(
    input_variables=["analyzed_intent", "test_specs", "language"],
    template="""
Generate the solution code in {language} for the following problem intent and test specifications.

Intent:
{analyzed_intent}

Test Specifications:
{test_specs}

Requirements:
- The code must be correct and aim to pass all the specified test cases.
- The code should be efficient and follow standard coding practices for {language}.
- Adhere strictly to {language} syntax and standard libraries.

**CRITICAL:** Output **ONLY** the raw source code for the solution. Do not include explanations, comments about the code, markdown formatting (like ```python), or any other text.

{language} Solution Code:
""",
)

# Use LCEL with StrOutputParser for raw string output
solution_generation_chain = (
    solution_generation_prompt_template | llm | StrOutputParser()
)


# Step 3: Test Case Generator Code Generation
test_gen_prompt_template = PromptTemplate(
    input_variables=["test_specs", "solution_code", "language"],
    template="""
Generate runnable {language} code for a test case generator based on the provided specifications and solution code.

Test Specifications:
{test_specs}

Solution Code ({language}):
```
{solution_code}
```

Requirements:
- The generated code must define a function, e.g., `generate_test_cases()`, that returns a list of test cases.
- Each test case in the list must be a dictionary containing 'input' and 'expected_output' keys.
- The generator code might need to import and execute the provided solution code logic (or re-implement its logic) to determine the correct `expected_output` for the generated `input` based on the test specifications.
- Ensure the generated inputs cover the scenarios described in the specifications (typical, edge cases, etc.).
- The generated code must be runnable in a standard {language} environment.

**CRITICAL:** Output **ONLY** the raw source code for the test case generator function. Do not include example usage, explanations, markdown formatting (like ```python), or any other text.

{language} Test Case Generator Code:
""",
)

# Use LCEL with StrOutputParser
test_gen_chain = test_gen_prompt_template | llm | StrOutputParser()

# Step 4: LLM-Based Validation
validation_parser = PydanticOutputParser(pydantic_object=ValidationOutput)

validation_prompt_template = PromptTemplate(
    input_variables=["solution_code", "test_gen_code", "test_specs", "language"],
    partial_variables={
        "format_instructions": validation_parser.get_format_instructions()
    },
    template="""
Review the provided solution code and test case generator code for consistency and correctness based on the test specifications.

Target Language: {language}
Test Specifications:
{test_specs}

Solution Code:
```
{solution_code}
```

Test Case Generator Code:
```
{test_gen_code}
```

Review Checklist:
1.  **Solution Correctness:** Does the solution code seem logically correct for implementing the described test specifications?
2.  **Test Generator Correctness:** Does the test generator code correctly produce inputs and expected outputs that match the test specifications? Does it seem like it would execute the solution logic correctly if needed?
3.  **Consistency:** Are there any obvious inconsistencies between the solution logic and the test generator's expectations?
4.  **Errors:** Are there any obvious syntax errors or potential runtime errors in either piece of code?

{format_instructions}

Valid JSON Output:
""",
)
# Use LCEL
validation_chain = validation_prompt_template | llm | validation_parser

# Step 5: Constraints Derivation
constraints_derivation_parser = PydanticOutputParser(pydantic_object=ConstraintsOutput)

constraints_derivation_prompt_template = PromptTemplate(
    input_variables=["solution_code", "test_specs", "language", "difficulty"],
    partial_variables={
        "format_instructions": constraints_derivation_parser.get_format_instructions()
    },
    template="""
Analyze the provided solution code and test specifications to derive appropriate constraints for a coding problem intended for **{difficulty}** difficulty.

Target Language: {language}

Solution Code:
```
{solution_code}
```

Test Specifications:
{test_specs}

Derive the following constraints, considering the {difficulty} level:
1.  **Time Limit:** Estimate a reasonable time limit (e.g., 1 or 2 seconds) based on typical competitive programming platform standards and the code's complexity.
2.  **Memory Limit:** Estimate a reasonable memory limit (e.g., 256 or 512 MB).
3.  **Input Constraints:** Specify clear constraints on input values (e.g., range of numbers, length of arrays/strings, character sets) consistent with the solution logic, test cases, and difficulty level.

{format_instructions}

Valid JSON Output:
""",
)

# Use LCEL
constraints_derivation_chain = (
    constraints_derivation_prompt_template | llm | constraints_derivation_parser
)

# Step 6: Problem Description Generation
description_generation_prompt_template = PromptTemplate(
    input_variables=[
        "analyzed_intent",
        "constraints",
        "test_specs",
        "difficulty",
        "language",
    ],
    template="""
Generate a user-facing problem description for a coding challenge based on the provided details. The tone and complexity should match the **{difficulty}** level.

Target Language: {language}

Problem Intent:
{analyzed_intent}

Constraints JSON:
{constraints}

Test Specification Examples (use for examples section):
{test_specs}

Instructions:
- Write a clear and engaging problem narrative based on the intent.
- Define the **Input Format** section clearly.
- Define the **Output Format** section clearly.
- Create a **Constraints** section, listing the constraints from the JSON input.
- Create an **Examples** section with 1-2 simple examples derived from the Test Specification Examples. Show input and corresponding output for each example.
- Ensure the overall tone, narrative complexity, and example difficulty match the specified **{difficulty}** level.

**CRITICAL:** Output **ONLY** the final problem description as a single block of plain text. You may use markdown internally for headers (e.g., `### Input Format`) or code blocks within the description, but the overall output must be just the description text.

Problem Description:
""",
)

# Use LCEL with StrOutputParser
description_generation_chain = (
    description_generation_prompt_template | llm | StrOutputParser()
)


# --- Helper Functions ---
def send_sse(event_type, payload):
    message = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
    sys.stdout.buffer.write(message.encode("utf-8"))
    sys.stdout.buffer.flush()
    if GENERATOR_VERBOSE:
        print(f"SSE Sent: {event_type} - {payload}")


def update_dynamodb_status(
    table, problem_id, status=None, error_message=None, **kwargs
):
    """Helper function to update DynamoDB item status and other attributes."""
    update_expression_parts = []
    expression_attribute_values = {}
    expression_attribute_names = {}

    if status:
        update_expression_parts.append("#genStatus = :status")
        expression_attribute_names["#genStatus"] = "generationStatus"
        expression_attribute_values[":status"] = status

    if error_message:
        update_expression_parts.append("#errMsg = :errMsg")
        expression_attribute_names["#errMsg"] = "errorMessage"
        expression_attribute_values[":errMsg"] = error_message

    # Add any other key-value pairs from kwargs
    for key, value in kwargs.items():
        # Use placeholders for attribute names to avoid reserved words
        placeholder_name = f"#{key}"
        placeholder_value = f":{key}Val"
        update_expression_parts.append(f"{placeholder_name} = {placeholder_value}")
        expression_attribute_names[placeholder_name] = key
        expression_attribute_values[placeholder_value] = value

    if not update_expression_parts:
        print(f"Warning: No updates provided for problem {problem_id}")
        return

    update_expression = "SET " + ", ".join(update_expression_parts)

    try:
        table.update_item(
            Key={"problemId": problem_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="UPDATED_NEW",  # Or NONE if not needed
        )
        if GENERATOR_VERBOSE:
            print(f"DynamoDB updated for {problem_id}: Status={status}, Args={kwargs}")
    except Exception as e:
        print(f"Error updating DynamoDB for {problem_id}: {e}")
        # Non-fatal for now, allow pipeline to continue


def clean_llm_output(output_string: str, expected_type: str = "code") -> str:
    """Cleans LLM string output, removing potential markdown fences or extra text."""
    cleaned = output_string.strip()
    if expected_type == "code":
        # Remove python/json markdown fences
        cleaned = (
            cleaned.removeprefix("```python")
            .removeprefix("```json")
            .removeprefix("```")
        )
        cleaned = cleaned.removesuffix("```").strip()
    elif expected_type == "json":
        # Find the first { and the last } to extract potential JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]
        else:
            # Fallback: remove markdown if JSON not found (might be just the JSON string)
            cleaned = (
                cleaned.removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
    return cleaned


# --- Main Lambda Handler ---
def lambda_handler(event, context):
    # This handler is designed for AWS Lambda Function URL with RESPONSE_STREAM (SSE)
    print("Event Received:", event)  # Log the event for debugging

    # --- Write SSE Headers FIRST ---
    # For Function URL Streaming, headers go to stdout before body goes to stdout.buffer
    try:
        sys.stdout.write("HTTP/1.1 200 OK\r\n")
        sys.stdout.write("Content-Type: text/event-stream\r\n")
        sys.stdout.write("Cache-Control: no-cache\r\n")
        sys.stdout.write("Connection: keep-alive\r\n")
        sys.stdout.write("\r\n")  # End of headers
        sys.stdout.flush()  # Ensure headers are sent
        print("SSE Headers written to stdout.")
    except Exception as header_err:
        # If headers fail, we probably can't send a useful error response via stream
        print(f"FATAL: Could not write headers to stdout: {header_err}")
        return  # Exit early

    problem_id = None  # Initialize problem_id
    problems_table = None  # Initialize table

    try:
        # 1. Parse Input
        body = json.loads(event.get("body", "{}"))
        user_prompt = body.get("prompt", "")
        difficulty = body.get("difficulty", "Medium")

        if not user_prompt:
            raise ValueError("User prompt is missing.")

        problem_id = str(uuid.uuid4())
        print(
            f"Generating problem {problem_id} for prompt: '{user_prompt}' ({difficulty})"
        )

        # Initialize DynamoDB Table
        problems_table = dynamodb.Table(PROBLEMS_TABLE_NAME)

        # Create initial DynamoDB record
        initial_item = {
            "problemId": problem_id,
            "userPrompt": user_prompt,
            "difficulty": difficulty,
            "generationStatus": "started",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "language": DEFAULT_LANGUAGE,
        }
        try:
            problems_table.put_item(
                Item=initial_item, ConditionExpression="attribute_not_exists(problemId)"
            )
            print(f"Initial DynamoDB record created for {problem_id}")
        except Exception as e:
            # Handle potential race condition or error if item already exists
            print(
                f"Warning: Could not create initial DynamoDB record for {problem_id} (maybe exists?): {e}"
            )
            # Attempt to update status anyway, assuming record might exist
            update_dynamodb_status(problems_table, problem_id, status="restarted")

        # Helper function for running chains and handling errors
        def run_chain_step(
            step_num, chain, input_data, output_key
        ):  # Removed expected_format
            nonlocal problems_table, problem_id  # Allow modifying outer scope vars
            try:
                # Invoke the LCEL chain
                # The output will be a Pydantic model for steps 1, 4, 5
                # or a string for steps 2, 3, 6
                output = chain.invoke(input_data)

                # Logging based on type
                if isinstance(output, BaseModel):
                    print(
                        f"Step {step_num} Output ({output.__class__.__name__}): {output.dict()}"
                    )
                else:  # Assumed string for code/text steps
                    print(
                        f"Step {step_num} Output (String):\n{output[:500]}{'...' if len(output) > 500 else ''}"
                    )  # Log preview

                return output
            # PydanticOutputParser raises OutputParserException on failure
            except (
                Exception
            ) as e:  # Catch broader exceptions, including OutputParserException
                error_msg = f"Error in Step {step_num} ({output_key}): {e}"
                # Attempt to log raw output if available in exception context (might not always work)
                raw_output_preview = ""
                if hasattr(e, "llm_output"):
                    raw_output_preview = str(e.llm_output)[:500]
                elif hasattr(e, "args") and len(e.args) > 0:
                    raw_output_preview = str(e.args[0])[:500]  # Generic fallback
                print(f"Error: {error_msg}. Raw Output Preview: {raw_output_preview}")

                traceback.print_exc()
                update_dynamodb_status(
                    problems_table,
                    problem_id,
                    status=f"step{step_num}_failed",
                    errorMessage=error_msg,
                )
                send_sse("error", {"payload": error_msg})
                raise e  # Re-raise exceptions

        # == PIPELINE START ==
        send_sse(
            "status",
            {"step": 1, "message": "Analyzing prompt and designing test cases..."},
        )
        step1_input = {
            "user_prompt": user_prompt,
            "difficulty": difficulty,
            "language": DEFAULT_LANGUAGE,
        }
        # Output is IntentAnalysisOutput model
        step1_output: IntentAnalysisOutput = run_chain_step(
            1, intent_analysis_chain, step1_input, "Intent/Tests"
        )
        analyzed_intent = step1_output.analyzed_intent
        test_specs = step1_output.test_specs  # This is Union[List[dict], str]

        if not analyzed_intent or not test_specs:
            raise ValueError("Step 1 failed to produce valid intent and test specs.")
        # Store test_specs as JSON string in DynamoDB
        test_specs_str = json.dumps(test_specs)
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step1_complete",
            analyzedIntent=analyzed_intent,
            testSpecifications=test_specs_str,
        )

        send_sse("status", {"step": 2, "message": "Generating solution code..."})
        step2_input = {
            "analyzed_intent": analyzed_intent,
            "test_specs": test_specs_str,  # Pass JSON string representation
            "language": DEFAULT_LANGUAGE,
        }
        # Output is a string
        solution_code_raw = run_chain_step(
            2,
            solution_generation_chain,
            step2_input,
            "Solution Code",
        )
        # Clean the raw code output
        solution_code = clean_llm_output(solution_code_raw, expected_type="code")
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step2_complete",
            solutionCode=solution_code,
        )

        send_sse("status", {"step": 3, "message": "Generating test case code..."})
        step3_input = {
            "test_specs": test_specs_str,  # Pass JSON string representation
            "solution_code": solution_code,
            "language": DEFAULT_LANGUAGE,
        }
        # Output is a string
        test_gen_code_raw = run_chain_step(
            3, test_gen_chain, step3_input, "Test Gen Code"
        )
        # Clean the raw code output
        test_gen_code = clean_llm_output(test_gen_code_raw, expected_type="code")
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step3_complete",
            testGeneratorCode=test_gen_code,
        )

        # Step 4: LLM-Based Validation (Interim Step)
        send_sse(
            "status",
            {"step": 4, "message": "Validating generated code (LLM Review)..."},
        )
        step4_input = {
            "solution_code": solution_code,
            "test_gen_code": test_gen_code,
            "test_specs": test_specs_str,  # Pass JSON string representation
            "language": DEFAULT_LANGUAGE,
        }
        # Output is ValidationOutput model
        validation_result: ValidationOutput = run_chain_step(
            4, validation_chain, step4_input, "Validation"
        )
        print(f"Step 4 Output (Validation): {validation_result.dict()}")
        if validation_result.status.lower() != "pass":
            error_msg = f"LLM Validation failed: {validation_result.details}"
            update_dynamodb_status(
                problems_table,
                problem_id,
                status="step4_failed",
                errorMessage=error_msg,
            )
            send_sse("error", {"payload": error_msg})
            raise ValueError(error_msg)
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step4_complete",
            validationDetails=validation_result.json(),  # Store as JSON string
        )
        send_sse("status", {"step": 4, "message": "Validation successful!"})

        send_sse("status", {"step": 5, "message": "Deriving problem constraints..."})
        step5_input = {
            "solution_code": solution_code,
            "test_specs": test_specs_str,  # Pass JSON string representation
            "language": DEFAULT_LANGUAGE,
            "difficulty": difficulty,
        }
        # Output is ConstraintsOutput model
        constraints: ConstraintsOutput = run_chain_step(
            5, constraints_derivation_chain, step5_input, "Constraints"
        )
        constraints_json = (
            constraints.json()
        )  # Convert model to JSON string for storage/later steps
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step5_complete",
            constraints=constraints_json,
        )

        send_sse(
            "status", {"step": 6, "message": "Generating final problem description..."}
        )
        # Use a subset of original specs for examples if they were structured
        example_specs_str = "[]"
        if isinstance(test_specs, list):
            example_specs_str = json.dumps(test_specs[:2])
        elif isinstance(test_specs, str):  # If specs were just a string initially
            example_specs_str = test_specs  # Use the string representation

        step6_input = {
            "analyzed_intent": analyzed_intent,
            "constraints": constraints_json,  # Pass JSON string
            "test_specs": example_specs_str,  # Pass example JSON string
            "difficulty": difficulty,
            "language": DEFAULT_LANGUAGE,
        }
        # Output is a string
        problem_description_raw = run_chain_step(
            6,
            description_generation_chain,
            step6_input,
            "Description",
        )
        # Clean the text output (basic strip)
        problem_description = clean_llm_output(
            problem_description_raw, expected_type="text"
        )
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="step6_complete",
            description=problem_description,
        )

        send_sse("status", {"step": 7, "message": "Finalizing and saving..."})
        # Step 7: Finalization
        problem_title = f"Generated Problem: {analyzed_intent[:50]}... ({difficulty})"  # TODO: Improve title generation?
        # Update final status in DynamoDB (most data already saved)
        update_dynamodb_status(
            problems_table,
            problem_id,
            status="completed",
            title=problem_title,
            completedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
        print(f"Step 7: Final status updated in DynamoDB for problem {problem_id}.")

        # Construct the final problem object from variables (no need to fetch again)
        final_problem = {
            "problemId": problem_id,
            "title": problem_title,
            "description": problem_description,
            "difficulty": difficulty,
            "constraints": constraints_json,  # Use JSON string
            "solutionCode": solution_code,
            "testGeneratorCode": test_gen_code,
            "analyzedIntent": analyzed_intent,
            "testSpecifications": test_specs_str,  # Use JSON string
            "generationStatus": "completed",
            "language": DEFAULT_LANGUAGE,
            "createdAt": problems_table.get_item(Key={"problemId": problem_id})
            .get("Item", {})
            .get("createdAt"),  # Fetch createdAt if needed
            "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        send_sse("result", {"payload": final_problem})
        send_sse("status", {"step": 7, "message": "✅ Generation complete!"})
        # == PIPELINE END ==

    except Exception as e:
        error_message = f"Error during generation: {str(e)}"
        print(f"Error: {error_message}")
        traceback.print_exc()
        # Update DynamoDB status to 'failed'
        if problem_id and problems_table:
            update_dynamodb_status(
                problems_table, problem_id, status="failed", errorMessage=error_message
            )
        try:
            send_sse("error", {"payload": error_message})
        except Exception as send_err:
            print(f"Failed to send error SSE: {send_err}")

    # For Function URL Streaming, the return value is NOT used for the response body.
    # The response body is entirely what's written to sys.stdout/sys.stdout.buffer.
    return "test"
