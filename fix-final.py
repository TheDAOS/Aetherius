import json

with open("supabase/functions/api-v1/index.ts", "r") as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]

    if "// --- Error Response Helper" in line:
        out.append("// --- API Response Envelopes ---\n")
        out.append("function successResponse(\n")
        out.append("  corsHeaders: Record<string, string>,\n")
        out.append("  data: unknown,\n")
        out.append("  status: number = 200,\n")
        out.append("): Response {\n")
        out.append("  return new Response(JSON.stringify({ data, error: null }), {\n")
        out.append("    status,\n")
        out.append("    headers: { ...corsHeaders, \"Content-Type\": \"application/json\" },\n")
        out.append("  });\n")
        out.append("}\n\n")
        out.append("function errorResponse(\n")
        i += 1 # skip function errorResponse(
        continue

    if "return new Response(JSON.stringify({ code, message }), {" in line:
        out.append("  return new Response(JSON.stringify({ data: null, error: { code, message } }), {\n")
        i += 1
        continue

    # 500 error at the end
    if "code: \"INTERNAL_ERROR\"," in line:
        out.append("        data: null,\n")
        out.append("        error: {\n")
        out.append("          code: \"INTERNAL_ERROR\",\n")
        out.append("          message: err.message || \"Internal server error\",\n")
        out.append("        }\n")
        i += 2 # skip code and message
        continue

    # Success replaces
    # Search for "return new Response("
    if "return new Response(" in line and "JSON.stringify" in lines[i+1]:
        # Need to check if it's a success response block
        if "status: 200," in lines[i+3] or "status: 201," in lines[i+3] or "status: 200," in lines[i+4] or "status: 201," in lines[i+4]:
            payload = lines[i+1].split("JSON.stringify(")[1].strip()
            
            # Find the closing parenthesis for JSON.stringify
            # It could be on the same line or next line
            if payload.endswith(","):
                payload = payload[:-1]
            if payload.endswith("),"):
                payload = payload[:-2]
            
            # Since formatting varies, let's just use regex on the whole file string for the success responses. 
            # Oh wait, writing a regex is easier if I do it exactly right.

            pass # Let's not use line by line for the complex blocks

    out.append(line)
    i += 1

