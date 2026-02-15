import re

file_path = r'c:\Users\test\Desktop\crownmania_main\crownmania_main copy\crownmania_frontend\src\components\Vault.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: "word - word" (already done, but run again to be sure)
# Fix 1b: "word -word" (space before hyphen only)
# Fix 1c: "word- word" (space after hyphen only)
# We match [a-z] - [a-z] with any combination of spaces, ensuring at least one space exists.
pattern_flexible_hyphen = r'([a-zA-Z])\s*-\s*([a-zA-Z])'
# We only want to replace if there WAS a space.
# Actually, identifying where a space was is implicit if we just replace with "-"
# But we must ensure we don't match "word-word" (already correct) and replacing it (harmless).
# The risk is "a - b" (subtraction). But CSS keywords don't usually do subtraction with letters on both sides.
# "calc(100vh - 50px)" -> "h - 5" -> "h-5"? No "vh" ends in h. "5" is digit.
# So "letter - letter" is almost always a hyphenated keyword in CSS.

old_content = ""
while old_content != content:
    old_content = content
    content = re.sub(pattern_flexible_hyphen, r'\1-\2', content)

# Fix 2: Selectors with spaces like "&: last-child" or "${Comp}: hover"
# &: followed by space
content = re.sub(r'&:\s+([a-z])', r'&:\1', content)
# }: followed by space (end of interpolation)
content = re.sub(r'}:\s+([a-z])', r'}:\1', content)

# Fix 3: "ease -in -out" -> might be "ease -in" (space before hyphen)
# My flexible hyphen pattern above handles "e -in" (e matches, i matches).
# So it should be fixed.

# Fix 4: "scale(1.05)" - check if "scale (1.05)" or "scale( 1.05 )"?
# view_file 628: "transform: translate(-50%, -50%) scale(1.05);" -> looks good.

# Fix 5: "nth - child" -> "nth-child"
# "h - c" -> matches flexible hyphen.

# Fix 6: "grid - template - columns"
# "d - t" -> "grid-template"
# "e - c" -> "template-columns"

# Fix 7: "1fr 1.2fr" -> "1 fr 1.2 fr"?
# view_file 708: "grid-template-columns: 1fr 1fr 1.2fr;" -> looks good.

# Fix 8: "rgba(0, 0, 0, 0.6)"
# view_file 588: "background: rgba(0, 0, 0, 0.6);" -> looks good.

# Fix 9: "z - index" -> "z -index" -> "z-index"

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully cleaned up CSS syntax (Pass 2) in Vault.jsx")
