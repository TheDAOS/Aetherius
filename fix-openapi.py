import yaml
from collections import OrderedDict

# Safe load/dump to preserve order (hacky but works for simple YAMLs)
def dict_representer(dumper, data):
    return dumper.represent_dict(data.items())
def dict_constructor(loader, node):
    return OrderedDict(loader.construct_pairs(node))

yaml.add_representer(OrderedDict, dict_representer, Dumper=yaml.SafeDumper)
yaml.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, dict_constructor, Loader=yaml.SafeLoader)

with open('openapi/openapi.yaml', 'r') as f:
    spec = yaml.safe_load(f)

# 1. Update paths
for path, methods in spec.get('paths', {}).items():
    for method, operation in methods.items():
        if 'responses' in operation:
            for status, response in operation['responses'].items():
                if status.startswith('2') and 'content' in response and 'application/json' in response['content']:
                    schema = response['content']['application/json'].get('schema', {})
                    if '$ref' in schema:
                        ref = schema['$ref']
                        response['content']['application/json']['schema'] = OrderedDict([
                            ('type', 'object'),
                            ('properties', OrderedDict([
                                ('data', OrderedDict([('$ref', ref)])),
                                ('error', OrderedDict([('nullable', True)]))
                            ]))
                        ])

# 2. Update responses (BadRequest, Unauthorized, Forbidden) to return the error wrapper
for name, response in spec.get('components', {}).get('responses', {}).items():
    if 'content' in response and 'application/json' in response['content']:
        schema = response['content']['application/json'].get('schema', {})
        if schema.get('$ref') == '#/components/schemas/Error':
            # Leave the ref, we'll redefine the Error schema itself to represent the whole envelope

            pass

# 3. Redefine Error schema to be the envelope
if 'components' in spec and 'schemas' in spec['components']:
    spec['components']['schemas']['Error'] = OrderedDict([
        ('type', 'object'),
        ('properties', OrderedDict([
            ('data', OrderedDict([('nullable', True)])),
            ('error', OrderedDict([
                ('type', 'object'),
                ('required', ['code', 'message']),
                ('properties', OrderedDict([
                    ('code', OrderedDict([('type', 'string')])),
                    ('message', OrderedDict([('type', 'string')]))
                ]))
            ]))
        ]))
    ])

with open('openapi/openapi.yaml', 'w') as f:
    yaml.safe_dump(spec, f, default_flow_style=False, sort_keys=False)

