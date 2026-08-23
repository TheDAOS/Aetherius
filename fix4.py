import re

with open("supabase/functions/api-v1/index.ts", "r") as f:
    text = f.read()

# 1. Replace all 200/201 success responses FIRST!
def success_replacer(m):
    payload = m.group(1).strip()
    status = m.group(2).strip()
    return f"return successResponse(corsHeaders, {payload}, {status});"

text = re.sub(r'return new Response\(\s*JSON\.stringify\((.*?)\)\s*,\s*\{\s*status:\s*(200|201),\s*headers:\s*\{\s*\.\.\.corsHeaders,\s*"Content-Type":\s*"application/json"\s*\}\s*,?\s*\}\s*,?\s*\);', success_replacer, text, flags=re.DOTALL)

# 2. Add API Response Envelopes SECOND! (So they don't get corrupted by step 1)
def envelope_replacer(m):
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

text = re.sub(r'// --- Error Response Helper.*?return new Response\(JSON\.stringify\(\{ code, message \}\), \{', envelope_replacer, text, flags=re.DOTALL)


# 3. Replace the 500 error catch block at the end of the file
def error_500_replacer(m):
    return """return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: err.message || "Internal server error",
        }
      }),
      {"""
text = re.sub(r'return new Response\(\s*JSON\.stringify\(\{\s*code: "INTERNAL_ERROR",\s*message: err\.message \|\| "Internal server error",\s*\}\),\s*\{', error_500_replacer, text, flags=re.DOTALL)

with open("supabase/functions/api-v1/index.ts", "w") as f:
    f.write(text)
