# Contributing to uiq

Thank you for your interest in contributing to uiq!

## Getting started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/tailordesign.git`
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Create a branch: `git checkout -b feature/my-feature`

## Adding a new rule

1. Add the rule to `src/config.js` (in the `RULES` array and `SOURCES` object)
2. Implement the check in `src/rules/index.js`
3. Add the rule to `SKILL.md` and `README.md`
4. Add a citation to `SOURCES.md`
5. Add tests in `tests/`
6. Submit a PR

## Rule guidelines

- Rules must be **deterministic** (no subjective judgment)
- Rules must be **objective** (map to an established standard)
- Rules must be **checkable via static analysis** (no rendering required)
- Every rule must cite a **real, published source** (no AI-generated sources)
- Sources must be **accessible URLs** (verify they open in a browser)

## Code style

- Use ES modules (`import`/`export`)
- Use `const` by default, `let` when needed
- Prefer `async/await` over callbacks
- Add JSDoc comments for public functions
- Keep functions small and focused

## Testing

- Run `npm test` before submitting
- Add tests for new rules in `tests/basic.test.js`
- Test both positive and negative cases

## Pull requests

- Keep PRs focused (one feature/fix per PR)
- Write a clear PR description
- Reference any related issues
- Ensure all tests pass

## Code of conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).
