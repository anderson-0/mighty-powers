---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD)

## Overview

**Core principle:** No production code without a failing test first. No exceptions, no rationalizations. If you didn't watch the test fail, you don't know if it tests the right thing.

Write code before the test? Delete it. Don't keep it as "reference." Don't "adapt" it. Delete means delete.

## When to Use

**Always:** New features, bug fixes, refactoring, behavior changes.

**Exceptions (ask your human partner):** Throwaway prototypes, generated code, configuration files.

## Test Strategy First

Before writing any test, list every external dependency and decide how to mock it:

| Dependency type | Testing approach |
|----------------|-----------------|
| Database | Mock the client (`vi.mock()` / `jest.mock()` on DB module) |
| Auth | Mock the auth call |
| HTTP APIs / AI providers | Mock the SDK — no real network calls |
| Pure functions | No mocks — test directly |
| UI components | `@testing-library/react` + mock data-fetching hooks |

Write this down: one sentence per dependency ("I will mock X by doing Y"). If you can't answer, the design needs adjustment. API routes are not exempt — mock auth and DB layers.

## Testability Triage (run after architecture, before first test)

Classify every file: **A** (fully testable: pure functions, API handlers, lib — target ≥85%), **B** (partially testable: components with side-effects — target ≥30%), **C** (browser-only — 0%, excluded). One line per file: `src/app/api/docs/route.ts — A (mock Clerk + Neon)`. Report A+B-only coverage separately from aggregate.

---

## Per-Feature Red-Green Pairing

**One feature at a time.** Complete the full RED→GREEN→REFACTOR cycle and commit before starting the next feature. Never batch all tests first then implement — that's batch-testing, not TDD.

---

## Red-Green-Refactor

`RED (write failing test) → verify fail → GREEN (minimal code) → verify pass → REFACTOR (clean up, stay green) → next test`

### RED - Write Failing Test

Write one minimal test showing what should happen.

```typescript
// Good: clear name, tests real behavior, one assertion target
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

**Requirements:** One behavior per test. Clear name describing behavior. Real code, no mocks unless unavoidable.

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code

Write simplest code to pass the test.

```typescript
// Good: just enough to pass — no options, no backoff, no YAGNI
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

### REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One thing. "and" in name? Split it. | `test('validates email and domain and whitespace')` |
| **Clear** | Name describes behavior | `test('test1')` |
| **Shows intent** | Demonstrates desired API | Obscures what code should do |

## DAMP Over DRY in Tests

Tests should be **Descriptive And Meaningful Prose**. Inline mock values in each test — a failing test should tell the whole story without tracing through setup helpers. Share helpers only when they validate behavior, not just set up state. Test names should be complete sentences.

**If you're tempted to skip TDD:** You're rationalizing. Tests-after answer "what does this do?" — tests-first answer "what should this do?" The test is faster to write than to debug later. Write it.

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "Keep as reference" or "adapt existing code"
- "Already spent X hours, deleting is wasteful"
- "TDD is dogmatic, I'm being pragmatic"
- "This is different because..."

**All of these mean: Delete code. Start over with TDD.**

## Example: Bug Fix

Bug: empty email accepted → **RED:** write `test('rejects empty email', ...)` asserting error → **verify fail** → **GREEN:** add `if (!data.email?.trim())` guard → **verify pass** → **REFACTOR** if needed.

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

- **Don't know how to test:** Write the wished-for API and assertion first. Ask your human partner.
- **Test too complicated:** Design too complicated. Simplify the interface.
- **Must mock everything:** Code too coupled. Use dependency injection.
- **Test setup huge:** Extract helpers. Still complex? Simplify design.

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Test proves fix and prevents regression.

Never fix bugs without a test.

## Testing Anti-Patterns

When adding mocks or test utilities, read @testing-anti-patterns.md to avoid common pitfalls:
- Testing mock behavior instead of real behavior
- Adding test-only methods to production classes
- Mocking without understanding dependencies

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without your human partner's permission.
