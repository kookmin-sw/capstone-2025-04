# Example: Read two integers from input and print their sum
try:
    a, b = map(int, input().split())
    print(a + b)
except Exception as e:
    # It's good practice for competitive programming solutions
    # to handle potential input errors gracefully, though not always required.
    import sys
    print(f"Error processing input: {e}", file=sys.stderr) 