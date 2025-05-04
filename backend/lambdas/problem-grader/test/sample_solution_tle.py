# Example: Causes a time limit exceeded error (infinite loop)

# Read input so it doesn't error out immediately if input is expected
try:
    input_line = input()
except EOFError:
    pass # Ignore if no input

# Infinite loop to cause TLE
while True:
    pass 