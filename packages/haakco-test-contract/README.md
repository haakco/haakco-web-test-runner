# haakco-test-contract

Pragmatic JSON Schema contract package for HaakCo test runner section manifests, runtime options, and result reports.

## Install

```bash
npm install haakco-test-contract
```

## Exports

```ts
import {
  SCHEMA_DRAFT,
  SECTIONS_SCHEMA_FILE,
  SECTIONS_SCHEMA_ID,
  SECTIONS_SCHEMA_RELATIVE_PATH,
  SECTIONS_SCHEMA_PATH,
} from 'haakco-test-contract';
```

- `SCHEMA_DRAFT`: expected JSON Schema draft URI (`2020-12`)
- `SECTIONS_SCHEMA_FILE`: schema filename
- `SECTIONS_SCHEMA_ID`: canonical schema ID
- `SECTIONS_SCHEMA_RELATIVE_PATH`: path from built entrypoint to schema file
- `SECTIONS_SCHEMA_PATH`: absolute resolved schema path at runtime

## Validate Schema JSON Parse

```bash
npm run validate:schema
```

This checks the schema file is valid JSON (quick sanity check). Full semantic schema validation can be added by consumers using a JSON Schema validator.
