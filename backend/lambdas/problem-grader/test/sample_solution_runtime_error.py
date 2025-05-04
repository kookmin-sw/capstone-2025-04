# Example: Causes a runtime error (division by zero)
try:
    a, b = map(int, input().split())
    # Cause a runtime error
    result = a / 0 
    print(result)
except Exception as e:
    # The runtime error itself will be caught by the runner
    # This except block might not even be reached in the runner context,
    # but included for completeness.
    import sys
    print(f"This might not be printed in runner: {e}", file=sys.stderr) 