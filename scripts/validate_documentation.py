#!/usr/bin/env python3
"""Validate HestivaOS documentation impact declarations and mechanically provable companions."""
import io
import os
import re
import subprocess
import sys
import tokenize
from pathlib import Path

CODE = {'.c', '.cc', '.cpp', '.css', '.go', '.java', '.js', '.jsx', '.mjs', '.py', '.rs', '.scss', '.ts', '.tsx'}
IMPLEMENTATION = CODE | {'.json', '.jsonc', '.prisma', '.sql', '.toml', '.yaml', '.yml'}
FIELDS = [
    'Architecture/component boundary',
    'Domain/business behavior',
    'Security/privacy/auth',
    'Database/schema/migration',
    'Deployment/runtime configuration',
    'Recovery/incident procedure',
    'Roadmap/planned state',
    'Cross-system contract',
    'Durable decision',
    'Repository/CI workflow',
]
CHANGELOG_VALUES = {'NONE', 'INTERNAL', 'OPERATOR', 'SECURITY', 'PLATFORM', 'CROSS_SYSTEM'}
CHANGELOG_REQUIRED = {'OPERATOR', 'SECURITY', 'PLATFORM', 'CROSS_SYSTEM'}


def git(*args, check=True):
    return subprocess.run(['git', *args], check=check, text=True, capture_output=True).stdout


def content(rev, path):
    return git('show', f'{rev}:{path}', check=False)


def normalized(text, suffix):
    if suffix == '.py':
        try:
            tokens = tokenize.generate_tokens(io.StringIO(text).readline)
            text = ''.join(value for kind, value, *_ in tokens if kind != tokenize.COMMENT)
        except (IndentationError, tokenize.TokenError):
            return text
    else:
        output, index, quote = [], 0, None
        while index < len(text):
            char = text[index]
            if quote:
                output.append(char)
                if char == '\\' and index + 1 < len(text):
                    index += 1
                    output.append(text[index])
                elif char == quote:
                    quote = None
            elif char in {'"', "'", '`'}:
                quote = char
                output.append(char)
            elif text.startswith('//', index):
                newline = text.find('\n', index)
                index = len(text) if newline < 0 else newline - 1
            elif text.startswith('/*', index):
                end = text.find('*/', index + 2)
                index = len(text) if end < 0 else end + 1
            else:
                output.append(char)
            index += 1
        text = ''.join(output)
    return re.sub(r'\s+', '', text)


def comment_only(base, head, path):
    suffix = Path(path).suffix.lower()
    return suffix in CODE and normalized(content(base, path), suffix) == normalized(content(head, path), suffix)


def parse_pr_body(body):
    result = {}
    for field in FIELDS:
        match = re.search(rf'^- {re.escape(field)}:\s*(YES|NO)\s*$', body, re.MULTILINE | re.IGNORECASE)
        if match:
            result[field] = match.group(1).upper()
    changelog = re.search(r'^- Changelog significance:\s*([A-Z_]+)\s*$', body, re.MULTILINE | re.IGNORECASE)
    companions = re.search(r'^- Documentation companions:\s*(.+?)\s*$', body, re.MULTILINE)
    coordination = re.search(r'^- Coordination source:\s*(.+?)\s*$', body, re.MULTILINE)
    return result, changelog.group(1).upper() if changelog else None, companions.group(1).strip() if companions else None, coordination.group(1).strip() if coordination else None


def is_meaningful(path, base, head):
    name = Path(path).name
    suffix = Path(path).suffix.lower()
    if name.startswith('LICENSE') or name == 'COPYING' or suffix == '.md':
        return False
    if suffix in IMPLEMENTATION or path in {'package-lock.json', 'package.json', 'railway.json'}:
        return not comment_only(base, head, path)
    return False


def inferred_impacts(paths):
    impacts = set()
    for path in paths:
        lower = path.lower()
        suffix = Path(path).suffix.lower()
        if path.startswith('apps/api/prisma/') or suffix in {'.prisma', '.sql'}:
            impacts.add('Database/schema/migration')
        if path.startswith('.github/') or path in {'scripts/validate_documentation.py', 'scripts/scan_secrets.py'}:
            impacts.add('Repository/CI workflow')
        if path == 'railway.json' or 'wrangler' in lower or 'cloudflare' in lower and suffix in {'.json', '.jsonc', '.toml', '.yaml', '.yml'}:
            impacts.add('Deployment/runtime configuration')
        if '/auth/' in lower or '/security/' in lower or lower.endswith(('auth.guard.ts', 'auth.service.ts', 'roles.guard.ts')):
            impacts.add('Security/privacy/auth')
        if path.startswith('apps/api/src/integrations/') or path.startswith('apps/api/src/messaging/adapters/'):
            impacts.add('Cross-system contract')
    return impacts


def companion_paths(raw):
    if not raw or raw.upper() == 'NONE':
        return set()
    return {part.strip().strip('`') for part in raw.split(',') if part.strip()}


def fail(message, errors):
    errors.append(message)


def main():
    if len(sys.argv) != 3:
        print(f'Usage: {sys.argv[0]} <base-revision> <head-revision>', file=sys.stderr)
        return 2
    base, head = sys.argv[1:]
    changed = git('diff', '--name-only', '--diff-filter=ACMRT', f'{base}...{head}').splitlines()
    changed_set = set(changed)
    meaningful = [path for path in changed if is_meaningful(path, base, head)]
    if not meaningful:
        print('Documentation policy passed: no meaningful implementation/tooling change requires an impact declaration.')
        return 0

    body = os.environ.get('PR_BODY', '')
    fields, changelog, companions_raw, coordination = parse_pr_body(body)
    errors = []

    for field in FIELDS:
        if field not in fields:
            fail(f'Missing Documentation impact field: {field}', errors)
    if changelog not in CHANGELOG_VALUES:
        fail(f'Changelog significance must be one of: {", ".join(sorted(CHANGELOG_VALUES))}', errors)
    if companions_raw is None:
        fail('Missing Documentation companions field.', errors)
    if coordination is None:
        fail('Missing Coordination source field.', errors)

    if errors:
        print('Documentation impact declaration is incomplete.', file=sys.stderr)
        for error in errors:
            print(f'  - {error}', file=sys.stderr)
        return 1

    inferred = inferred_impacts(meaningful)
    for impact in sorted(inferred):
        if fields.get(impact) != 'YES':
            fail(f'Changed paths mechanically imply `{impact}: YES`, but the PR declares NO.', errors)

    companions = companion_paths(companions_raw)
    missing_declared = sorted(path for path in companions if path not in changed_set)
    for path in missing_declared:
        fail(f'Documentation companion `{path}` is declared but is not changed in this PR.', errors)

    yes_fields = {field for field, value in fields.items() if value == 'YES'}
    if yes_fields and not companions and yes_fields != {'Cross-system contract'}:
        fail('At least one Documentation companion is required when a documentation impact is YES.', errors)

    required_companions = {
        'Architecture/component boundary': 'docs/ARCHITECTURE.md',
        'Deployment/runtime configuration': 'docs/DEPLOYMENT.md',
        'Recovery/incident procedure': 'docs/RECOVERY_GUIDE.md',
        'Roadmap/planned state': 'docs/ROADMAP.md',
        'Repository/CI workflow': 'docs/README.md',
    }
    for field, required in required_companions.items():
        if fields.get(field) == 'YES' and required not in changed_set:
            fail(f'`{field}: YES` requires `{required}` in the PR diff.', errors)

    if fields.get('Durable decision') == 'YES':
        adr_changes = [path for path in changed if path.startswith('docs/decisions/ADR-') and path.endswith('.md')]
        if not adr_changes:
            fail('`Durable decision: YES` requires an ADR change.', errors)
        if 'docs/decisions/README.md' not in changed_set:
            fail('`Durable decision: YES` requires `docs/decisions/README.md`.', errors)

    if fields.get('Cross-system contract') == 'YES' and (not coordination or coordination.upper() == 'NONE'):
        fail('`Cross-system contract: YES` requires a non-NONE Coordination source.', errors)

    if changelog in CHANGELOG_REQUIRED and 'docs/CHANGELOG.md' not in changed_set:
        fail(f'Changelog significance `{changelog}` requires `docs/CHANGELOG.md`.', errors)

    if 'docs/TECHNICAL_WORK_LOG.md' in changed_set:
        print('Note: TECHNICAL_WORK_LOG.md is historical lookup material after ADR-0069; verify that this edit is intentionally historical/reconciliation work.')

    if errors:
        print('Documentation policy failed.', file=sys.stderr)
        print('Meaningful implementation/tooling changes:', file=sys.stderr)
        for path in meaningful:
            print(f'  - {path}', file=sys.stderr)
        print('Errors:', file=sys.stderr)
        for error in errors:
            print(f'  - {error}', file=sys.stderr)
        print('See AGENTS.md and docs/DOCUMENTATION_AUTHORITY.md.', file=sys.stderr)
        return 1

    print('Documentation policy passed: impact declaration is complete and all mechanically provable impacts/companions are consistent.')
    if inferred:
        print('Mechanically inferred impacts: ' + ', '.join(sorted(inferred)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
