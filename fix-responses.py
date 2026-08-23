import re

with open("supabase/functions/api-v1/index.ts", "r") as f:
    content = f.read()

# Replace hardcoded Response(JSON.stringify(payload), { status: 200, headers: ... }) with successResponse
# Pattern: return new Response( \s* JSON.stringify( (.*?) ), \s* { \s* status: 200, \s* headers: { \.\.\.corsHeaders, "Content-Type": "application/json" } \s* } \s* );

# 1. Single line:
# return new Response(JSON.stringify({ path: queryPath, entries }), {
#             status: 200,
#             headers: { ...corsHeaders, "Content-Type": "application/json" },
#           });
content = re.sub(
    r'return new Response\s*\(\s*JSON\.stringify\(\s*(\{.*?\})\s*\)\s*,\s*\{\s*status:\s*200\s*,\s*headers:\s*\{\s*\.\.\.corsHeaders,\s*"Content-Type":\s*"application/json"\s*\}\s*,?\s*\}\s*\);',
    r'return successResponse(corsHeaders, \1);',
    content,
    flags=re.DOTALL
)

with open("supabase/functions/api-v1/index.ts", "w") as f:
    f.write(content)

