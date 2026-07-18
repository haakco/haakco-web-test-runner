import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema';
export const SECTIONS_SCHEMA_FILE = 'sections.schema.json';
export const SECTIONS_SCHEMA_ID = 'https://haakco.dev/schemas/test-runner/sections.schema.json';
export const SECTIONS_SCHEMA_RELATIVE_PATH = '../schemas/sections.schema.json';
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
export const SECTIONS_SCHEMA_PATH = resolve(currentDirPath, SECTIONS_SCHEMA_RELATIVE_PATH);
//# sourceMappingURL=index.js.map