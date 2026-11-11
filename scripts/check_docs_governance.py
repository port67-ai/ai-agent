#!/usr/bin/env python3
"""Check structural project-memory obligations; semantic review remains required."""
import argparse
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--base', required=True, help='Commit/ref to compare, e.g. origin/main')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root, text=True)

required = ['PRD.md', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README.md'] + [
    'docs/' + name + '.md' for name in ['GOVERNANCE', 'ARCHITECTURE', 'DATA_MODEL',
    'DECISIONS', 'CHANGELOG', 'IMPLEMENTATION_STATUS', 'HANDOVER', 'TESTING',
    'SECURITY', 'COST_MODEL', 'RUNBOOK', 'SYNAPSE_AUDIT']]
errors = []
for name in required:
    if not (root / name).is_file() or not (root / name).read_text().strip():
        errors.append('Missing/empty: ' + name)
for name in ['CLAUDE.md', 'GEMINI.md']:
    if (root / name).exists() and 'AGENTS.md' not in (root / name).read_text():
        errors.append(name + ' must reference shared AGENTS.md')
prd = (root / 'PRD.md').read_text() if (root / 'PRD.md').exists() else ''
status = (root / 'docs/IMPLEMENTATION_STATUS.md').read_text() if (root / 'docs/IMPLEMENTATION_STATUS.md').exists() else ''
for requirement in set(re.findall(r'\| (FAC-[A-Z]+-\d+) \|', prd)):
    if requirement not in status:
        errors.append('Status missing requirement: ' + requirement)
# Include staged, unstaged and untracked changes when run locally; CI uses committed diff.
changed = set(git('diff', '--name-only', args.base, '--').splitlines())
changed.update(git('ls-files', '--others', '--exclude-standard').splitlines())
substantive = changed - {'docs/HANDOVER.md', 'docs/IMPLEMENTATION_STATUS.md', 'docs/CHANGELOG.md'}
if substantive:
    for name in ['docs/HANDOVER.md', 'docs/IMPLEMENTATION_STATUS.md', 'docs/CHANGELOG.md']:
        if name not in changed:
            errors.append('Substantive change requires update: ' + name)
    log = (root / 'docs/CHANGELOG.md').read_text() if (root / 'docs/CHANGELOG.md').exists() else ''
    if not re.search(r'CHG-\d+', log) or 'PRD impact:' not in log:
        errors.append('Changelog needs a change ID and PRD impact statement')
if errors:
    raise SystemExit('\n'.join(errors))
print('Documentation governance passed (structural checks only).')
