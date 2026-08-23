import re

with open("supabase/functions/api-v1/index.ts", "r") as f:
    text = f.read()

# 1. Add successResponse and modify errorResponse
def replacer1(m):
    return """// --- API Response Envelopes ---
function successResponse(
  corsHeaders: Record<string, string>,
  data: unknown,
  status: number = 200,
): Response {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  corsHeaders: Record<string, string>,
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ data: null, error: { code, message } }), {"""
text = re.sub(r'// --- Error Response Helper.*?return new Response\(JSON\.stringify\(\{ code, message \}\), \{', replacer1, text, flags=re.DOTALL)

# 2. Replace hardcoded Response(JSON.stringify({ ... }))
# Pattern:
# return new Response(
#   JSON.stringify( ... ),
#   {
#     status: 200|201,
#     headers: ...
#   }
# )
def replacer2(m):
    payload = m.group(1).strip()
    status = m.group(2).strip()
    if status in ["200", "201"]:
        return f"return successResponse(corsHeaders, {payload}, {status});"
    return m.group(0)

# The one-liner:
text = re.sub(
    r'return new Response\(\s*JSON\.stringify\((.*?)\)\s*,\s*\{\s*status:\s*(200|201),\s*headers:\s*\{.*?\}\s*,?\s*\}\s*,?\s*\);',
    replacer2,
    text,
    flags=re.DOTALL
)

with open("supabase/functions/api-v1/index.ts", "w") as f:
    f.write(text)
