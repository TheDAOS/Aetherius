import re

with open("supabase/functions/api-v1/index.ts", "r") as f:
    text = f.read()

# We want to replace:
# return new Response(
#   JSON.stringify({ ... }),
#   { status: 200, headers: { ... } }
# )
# Or similar on one line.
#
# Let's just find `return new Response(` and rewrite it.

pattern = re.compile(
    r'return new Response\(\s*JSON\.stringify\((.*?)\)\s*,\s*\{\s*status:\s*(\d+),\s*headers:\s*\{[^}]*\}\s*,?\s*\}\s*,?\s*\);',
    re.DOTALL
)

def replacer(match):
    payload = match.group(1).strip()
    status = match.group(2).strip()
    if status == "200" or status == "201":
        return f"return successResponse(corsHeaders, {payload}, {status});"
    return match.group(0)

new_text = pattern.sub(replacer, text)

# There is also one that has no status:
# return new Response(JSON.stringify({ ... }), {
#   status: 200, ...
# });

with open("supabase/functions/api-v1/index.ts", "w") as f:
    f.write(new_text)
