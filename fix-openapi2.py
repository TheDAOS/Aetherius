import re

with open("openapi/openapi.yaml", "r") as f:
    text = f.read()

# Only replace $ref if it's right under `schema:` in responses.
# Pattern:
#               schema:
#                 $ref: "#/components/schemas/Vault"

def replacer(match):
    indent = match.group(1)
    ref = match.group(2)
    return f"""{indent}schema:
{indent}  type: object
{indent}  properties:
{indent}    data:
{indent}      $ref: "{ref}"
{indent}    error:
{indent}      nullable: true"""

text = re.sub(r'(\s+)schema:\n\s+\$ref:\s*"(.*?)"', replacer, text)

error_old = """    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string"""

error_new = """    Error:
      type: object
      properties:
        data:
          nullable: true
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
            message:
              type: string"""

text = text.replace(error_old, error_new)

with open("openapi/openapi.yaml", "w") as f:
    f.write(text)

