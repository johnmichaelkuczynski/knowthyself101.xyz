---
name: orval component naming collision
description: Why a PUT request-body OpenAPI component must not share its name with the operationId-derived zod schema name in this repo's orval codegen.
---

# Orval request-body component naming

When adding a write endpoint (PUT/POST) to `lib/api-spec/openapi.yaml`, name the
request-body component schema so it does NOT collide with the name orval derives
from the operationId for its generated zod validator.

**Concretely:** for `operationId: updateSettings`, orval generates a zod schema
named after the operation (e.g. `updateSettingsBody`/`UpdateSettingsBody`). If you
also name the request-body component `UpdateSettingsBody`, the generated TS type
and the generated zod schema collide on the same identifier and codegen output is
broken. Naming the component `SettingsInput` avoids it.

**Why:** orval emits both a TypeScript type (from the component name) and a zod
validator (from the operationId). Same name → duplicate identifier.

**How to apply:** give request-body components a distinct, input-flavored name
(e.g. `SettingsInput`, `FooCreateInput`) rather than `<Operation>Body`. After any
spec change run `pnpm --filter @workspace/api-spec run codegen` and confirm clean.
Do not change `info.title` — it controls generated filenames.
