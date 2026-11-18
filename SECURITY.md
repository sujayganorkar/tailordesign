# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a vulnerability

If you discover a security vulnerability, please report it by emailing the maintainer directly. Do not open a public issue.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work on a fix as soon as possible.

## Scope

This tool reads source code files and writes state/feedback/escalation files. It does not:
- Execute arbitrary code
- Make network requests
- Access environment variables (except standard Node.js)
- Store or transmit user data
