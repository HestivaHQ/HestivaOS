#!/usr/bin/env python3
"""Scan tracked repository content for a small set of high-confidence secrets."""

import re
import subprocess
import sys


PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:gh[opsu]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "Slack token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
}


def tracked_files() -> list[str]:
    output = subprocess.run(
        ["git", "ls-files", "-z"], check=True, capture_output=True
    ).stdout
    return [path.decode() for path in output.split(b"\0") if path]


def main() -> int:
    findings: list[str] = []
    for path in tracked_files():
        try:
            with open(path, "r", encoding="utf-8") as source:
                for line_number, line in enumerate(source, 1):
                    for label, pattern in PATTERNS.items():
                        if pattern.search(line):
                            findings.append(f"{path}:{line_number}: possible {label}")
        except (OSError, UnicodeDecodeError):
            continue

    if findings:
        print("Secret scan failed:", file=sys.stderr)
        print("\n".join(findings), file=sys.stderr)
        return 1
    print(f"Secret scan passed: checked {len(tracked_files())} tracked files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
