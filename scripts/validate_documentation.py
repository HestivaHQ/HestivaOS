#!/usr/bin/env python3
"""Fail when a meaningful implementation diff has no docs/ companion change."""
import io, re, subprocess, sys, tokenize
from pathlib import Path
CODE = {'.c','.cc','.cpp','.css','.go','.java','.js','.jsx','.mjs','.py','.rs','.scss','.ts','.tsx'}
IMPLEMENTATION = CODE | {'.json','.jsonc','.prisma','.sql','.toml','.yaml','.yml'}

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
    if path.startswith('.github/'): return 'CI/CD: DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if 'cloudflare' in path.lower() or 'wrangler' in path.lower(): return 'Cloudflare: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if 'railway' in path.lower(): return 'Railway: ARCHITECTURE, DEPLOYMENT, RECOVERY_GUIDE, work log, changelog, and any applicable ADR'
    if path.endswith(('package.json','package-lock.json')): return 'dependencies/build: ARCHITECTURE or WHY, DEPLOYMENT when applicable, work log, changelog, and any applicable ADR'
    if path.startswith('apps/api/'): return 'API/auth/workflow: ARCHITECTURE, ENVIRONMENT/RECOVERY when applicable, work log, changelog, and any applicable ADR'
    if path.startswith('apps/web/'): return 'frontend/workflow: ARCHITECTURE, WHY/ROADMAP when applicable, work log, and changelog'
    return 'implementation/tooling: apply the AGENTS.md matrix; work log and changelog are normally required'

def main():
    if len(sys.argv)!=3:
        print(f'Usage: {sys.argv[0]} <base-revision> <head-revision>',file=sys.stderr); return 2
    base,head=sys.argv[1:]
    changed=git('diff','--name-only','--diff-filter=ACMRT',f'{base}...{head}').splitlines()
    if any(p.startswith('docs/') for p in changed):
        print('Documentation policy passed: docs/ was updated in this change.'); return 0
    meaningful=[]
    for path in changed:
        name=Path(path).name; suffix=Path(path).suffix.lower()
        if name.startswith('LICENSE') or name=='COPYING' or suffix=='.md': continue
        if suffix in IMPLEMENTATION or path in {'package-lock.json','package.json','railway.json'}:
            if not comment_only(base,head,path): meaningful.append(path)
    if not meaningful:
        print('Documentation policy passed: no meaningful implementation change requires docs/ updates.'); return 0
    print('Documentation policy failed: implementation changed, but docs/ was not modified.',file=sys.stderr)
    print('Review these changes and update the verified, applicable documentation:',file=sys.stderr)
    for path in meaningful: print(f'  - {path}: {guidance(path)}',file=sys.stderr)
    print('See AGENTS.md. Do not add an unrelated docs edit merely to pass this check.',file=sys.stderr); return 1
if __name__=='__main__': raise SystemExit(main())
