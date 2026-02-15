import re

file_path = r'c:\Users\test\Desktop\crownmania_main\crownmania_main copy\crownmania_frontend\src\components\Vault.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Hyphenated words with spaces (e.g., "grid - column", "font - family", "mix - blend - mode", "var(--font - primary)")
# We repeat strictly to handle multiple hyphens in one go or we can just loop until no change
# Regex: isolated letter, space, hyphen, space, isolated letter
# this matches "d - c" in "grid - column"
# But we want to be careful not to break " 5 - 3 " (math)
# CSS properties and variables generally use lowercase letters.
# We will target [a-zA-Z] - [a-zA-Z]
pattern_hyphen = r'([a-zA-Z])\s+-\s+([a-zA-Z])'

# Apply repeatedly until no changes (to handle "mix - blend - mode")
old_content = ""
while old_content != content:
    old_content = content
    content = re.sub(pattern_hyphen, r'\1-\2', content)

# Fix 2: Percentages with spaces (e.g., "50 %")
pattern_percent = r'(\d)\s+%'
content = re.sub(pattern_percent, r'\1%', content)

# Fix 3: "px" with spaces? "600 px"?
# view_file showed "min - height: 600px;" so px seems fine, but let's check "600 px"
pattern_px = r'(\d)\s+px'
content = re.sub(pattern_px, r'\1px', content)

# Fix 4: Fix styled component definitions that might have been broken like "styled.div`" (view_file didn't show this broken)
# view_file line 585: "const CrownWeightModule = styled.div`" - Looks valid.

# Fix 5: Ensure " !important" doesn't have a space before "!" if it got split? " ! important"?
# view_file didn't show this.

# Fix 6: "var --" ?
# view_file: "var(--font - primary)" -> "var(--font-primary)" handled by Fix 1.

# Fix 7: "min - height" -> "min-height" handled by Fix 1.

# Fix 8: "1.5s" -> "1.5 s"?
# view_file 772: "transition: filter 1.5s cubic - bezier(0.16, 1, 0.3, 1);"
# "cubic - bezier" will be handled by Fix 1.
# "1.5s" looks fine.

# Fix 9: "ease -in -out" -> "ease-in-out"
# 784: "transition: opacity 0.8s ease -in -out;"
# "ease -in" -> "ease-in" (Fix 1: e - i)
# "-in -out" -> "in -out" -> "in-out" (Fix 1: n - o)

# Fix 10: "z - index" -> "z-index" (Fix 1: z - i)

# Fix 11: "box - shadow" -> "box-shadow" (Fix 1: x - s)

# Fix 12: "border - radius" -> "border-radius" (Fix 1: r - r)

# Fix 13: "justify - content" -> "justify-content" (Fix 1: y - c)

# Fix 14: "align - items" -> "align-items" (Fix 1: n - i)

# Fix 15: "@media(max - width: " -> "@media(max-width:"
# "x - w" -> "x-w" handled by Fix 1.

# Additional check:
# "filter: blur(2 px)"?
# pattern_px will handle it.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully cleaned up CSS syntax in Vault.jsx")
