#!/usr/bin/env python3
"""Scan publishable files (or HEAD history) without printing credential values."""
import argparse
import pathlib
import re
import subprocess
import sys
parser = argparse.ArgumentParser()
parser.add_argument('--history', action='store_true')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', '-C', str(root), *args])
patterns = {
    'private-key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
    'provider-token': re.compile(rb'(?<![\w-])(?:gh[pousr]_[\w]{20,}|github_pat_[\w]{20,}|sk-(?:proj-|ant-api\d+-|or-v1-)?[\w-]{20,}|sb_secret_[\w-]{16,})'),
    'hardcoded-secret': re.compile(rb'''(?i)(?:client_secret|service_key|platform_ai_key)\s*=\s*["'][A-Za-z0-9_+/=-]{24,}["']'''),
    'credential-url': re.compile(rb'(?:postgres(?:ql)?|mysql|mongodb|redis)://[^\s/:]+:[^\s/@]+@'),
    'personal-path': re.compile(rb'(?:/Users/|C:\\Users\\)[A-Za-z0-9_.-]+'),
    'public-key-literal': re.compile(rb'sb_publishable_[A-Za-z0-9_-]{16,}'),
}
forbidden_parts = {'.claude', '.openclaw', '.kairos', 'memory', 'playwright-report', 'test-results', 'node_modules'}
forbidden_names = {'MEMORY.md', 'USER.md', 'TOOLS.md', 'SOUL.md', 'token.json', 'credentials.json'}
def excluded(path):
    p = pathlib.PurePosixPath(path)
    return bool(set(p.parts) & forbidden_parts) or p.name in forbidden_names or (p.name.startswith('.env') and p.name != '.env.example')
entries = []
if args.history:
    for line in git('rev-list', '--objects', 'HEAD').decode().splitlines():
        if ' ' not in line: continue
        oid, path = line.split(' ', 1)
        if git('cat-file', '-t', oid).strip() == b'blob': entries.append((path, git('cat-file', 'blob', oid)))
else:
    for path in sorted(set(git('ls-files', '--cached', '--others', '--exclude-standard').decode().splitlines())):
        file = root / path
        if file.is_file(): entries.append((path, file.read_bytes()))
failures = []
for path, data in entries:
    if excluded(path): failures.append((path, 0, 'private/generated path'))
    for name, pattern in patterns.items():
        for match in pattern.finditer(data): failures.append((path, data.count(b'\n', 0, match.start()) + 1, name))
for path, line, rule in sorted(set(failures)): print(f'{path}:{line}: {rule}')
print(f'Scanned {len(entries)} file objects; {len(failures)} findings. Values are never printed.')
sys.exit(bool(failures))
