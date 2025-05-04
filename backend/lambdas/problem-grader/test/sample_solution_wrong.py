# Example: Intentionally calculates the wrong answer (subtraction instead of addition)
try:
    a, b = map(int, input().split())
    # Intentionally wrong logic
    print(a - b) 
except Exception as e:
    import sys
    print(f"Error processing input: {e}", file=sys.stderr) 