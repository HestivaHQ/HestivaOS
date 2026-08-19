#!/usr/bin/env python3
"""Validate minimum documentation companions for meaningful implementation changes."""
import io, re, subprocess, sys, tokenize
from pathlib import Path

CODE = {'.c','.cc','.cpp','.css','.go','.java','.js','.jsx','.mjs','.py','.rs','.scss','.ts','.tsx'}
IMPLEMENTATION = CODE | {'.json','.jsonc','.prisma','.sql','.toml','.yaml','.yml'}
MANDATORY_IMPLEMENTATION_HISTORY = {
    'docs/CHANGELOG.md',
    'docs/TECHNICAL_WORK_LOG.md',
}

def git(*args, check=True):
    return subprocess.run(['git',*args],check=check,text=True,capture_output=True).stdout

def content(rev,path): return git('show',f'{rev}:{path}',check=False)
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
                    index += 1; output.append(text[index])
                elif char == quote: quote = None
            elif char in {'\"', "'", '`'}:
                quote = char; output.append(char)
            elif text.startswith('//', index):
                newline = text.find('\n', index); index = len(text) if newline < 0 else newline - 1
            elif text.startswith('/*', index):
                end = text.find('*/', index + 2); index = len(text) if end < 0 else end + 1
            else: output.append(char)
            index += 1
        text = ''.join(output)
    return re.sub(r'\s+', '', text)

def comment_only(base,head,path):
    suffix=Path(path).suffix.lower()
    return suffix in CODE and normalized(content(base,path),suffix)==normalized(content(head,path),suffix)

def guidance(path):
    if 'prisma/' in path or path.endswith(('.prisma','.sql')): return 'database/Prisma: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if path.startswith('.github/'): return 'CI/CD: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if 'cloudflare' in path.lower() or 'wrangler' in path.lower(): return 'Cloudflare: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if 'railway' in path.lower(): return 'Railway: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if path.endswith(('package.json','package-lock.json')): return 'dependencies/build: ARCHITECTURE or WHY, DEPLOYMENT when applicable, work log, changelog, and any applicable ADR'
    if path.startswith('apps/api/'): return 'API/auth/workflow: ARCHITECTURE, ENVIRONMENT/RECOVERY when applicable, work log, changelog, and any applicable ADR'
    if path.startswith('apps/web/'): return 'frontend/workflow: ARCHITECTURE, WHY/ROADMAP when applicable, work log, and changelog'
    return 'implementation/tooling: apply the AGENTS.md matrix; work log and changelog are required'

def main():
    if len(sys.argv)!=3:
        print(f'Usage: {sys.argv[0]} <base-revision> <head-revision>',file=sys.stderr); return 2
    base,head=sys.argv[1:]
    changed=git('diff','--name-only','--diff-filter=ACMRT',f'{base}...{head}').splitlines()
    changed_set=set(changed)
    meaningful=[]
    for path in changed:
        name=Path(path).name; suffix=Path(path).suffix.lower()
        if name.startswith('LICENSE') or name=='COPYING' or suffix=='.md': continue
        if suffix in IMPLEMENTATION or path in {'package-lock.json','package.json','railway.json'}:
            if not comment_only(base,head,path): meaningful.append(path)
    if not meaningful:
        print('Documentation policy passed: no meaningful implementation change requires docs updates.'); return 0
    docs_changed=sorted(path for path in changed if path.startswith('docs/'))
    missing_history=sorted(MANDATORY_IMPLEMENTATION_HISTORY - changed_set)
    if docs_changed and not missing_history:
        print('Documentation policy passed: implementation has docs coverage plus mandatory changelog and technical work log updates.'); return 0
    print('Documentation policy failed for meaningful implementation changes.',file=sys.stderr)
    if not docs_changed:
        print('No docs/ companion change was found.',file=sys.stderr)
    if missing_history:
        print('Mandatory implementation history files missing from the diff:',file=sys.stderr)
        for path in missing_history: print(f'  - {path}',file=sys.stderr)
    print('Review these implementation changes and update the verified, applicable documentation:',file=sys.stderr)
    for path in meaningful: print(f'  - {path}: {guidance(path)}',file=sys.stderr)
    print('See AGENTS.md. Passing this validator is a minimum gate; the complete documentation matrix still applies.',file=sys.stderr)
    return 1

if __name__=='__main__': raise SystemExit(main())
