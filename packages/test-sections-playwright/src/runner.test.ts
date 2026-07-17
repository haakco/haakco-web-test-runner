import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  buildSectionCommand,
  formatDuration,
  globToRegExp,
  normalizePath,
  parseArgs,
  parsePositiveInteger,
  resolveSectionFiles,
  runConcurrentSections,
  sectionArgs,
  selectSections,
  validateCoverage,
} from './runner.js';
import type { PlaywrightTestSection } from './types.js';

describe('parseArgs', () => {
  test('returns empty options for no args', () => {
    const opts = parseArgs([]);
    assert.equal(opts.list, false);
    assert.equal(opts.validate, false);
    assert.equal(opts.help, false);
    assert.deepEqual(opts.sectionIds, []);
    assert.equal(opts.parallel, undefined);
    assert.equal(opts.shard, undefined);
    assert.equal(opts.configPath, undefined);
  });

  test('strips bare -- tokens before parsing flags', () => {
    const opts = parseArgs(['--section', '--', 'smoke']);
    assert.deepEqual(opts.sectionIds, ['smoke']);
  });

  test('treats run as an optional command token', () => {
    const opts = parseArgs(['run', '--list']);
    assert.equal(opts.list, true);
  });

  test('parses --section with space-separated value', () => {
    const opts = parseArgs(['--section', 'smoke']);
    assert.deepEqual(opts.sectionIds, ['smoke']);
  });

  test('parses --section=value form', () => {
    const opts = parseArgs(['--section=checkout']);
    assert.deepEqual(opts.sectionIds, ['checkout']);
  });

  test('parses comma-separated section ids', () => {
    const opts = parseArgs(['--section', 'smoke,checkout,api']);
    assert.deepEqual(opts.sectionIds, ['smoke', 'checkout', 'api']);
  });

  test('parses repeated --section flags', () => {
    const opts = parseArgs(['--section', 'smoke', '--section', 'api']);
    assert.deepEqual(opts.sectionIds, ['smoke', 'api']);
  });

  test('trims whitespace and ignores empty entries in comma lists', () => {
    const opts = parseArgs(['--section', ' smoke , , api , ']);
    assert.deepEqual(opts.sectionIds, ['smoke', 'api']);
  });

  test('throws on missing value for --section', () => {
    assert.throws(() => parseArgs(['--section']), /Missing value for --section/);
  });

  test('parses --parallel with positive integer', () => {
    const opts = parseArgs(['--parallel', '3']);
    assert.equal(opts.parallel, 3);
  });

  test('parses --parallel=value form', () => {
    const opts = parseArgs(['--parallel=4']);
    assert.equal(opts.parallel, 4);
  });

  test('throws on non-positive --parallel', () => {
    assert.throws(() => parseArgs(['--parallel', '0']), /must be a positive integer/);
    assert.throws(() => parseArgs(['--parallel', '-1']), /must be a positive integer/);
    assert.throws(() => parseArgs(['--parallel', 'abc']), /must be a positive integer/);
  });

  test('parses --shard value', () => {
    const opts = parseArgs(['--shard', '1/2']);
    assert.equal(opts.shard, '1/2');
  });

  test('parses --shard=value form', () => {
    const opts = parseArgs(['--shard=2/4']);
    assert.equal(opts.shard, '2/4');
  });

  test('parses --config and -c aliases', () => {
    assert.equal(parseArgs(['--config', 'a.config.ts']).configPath, 'a.config.ts');
    assert.equal(parseArgs(['-c', 'b.config.ts']).configPath, 'b.config.ts');
    assert.equal(parseArgs(['--config=c.config.ts']).configPath, 'c.config.ts');
  });

  test('parses --help and -h', () => {
    assert.equal(parseArgs(['--help']).help, true);
    assert.equal(parseArgs(['-h']).help, true);
  });

  test('throws on unknown argument', () => {
    assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
  });
});

describe('parsePositiveInteger', () => {
  test('accepts positive integers', () => {
    assert.equal(parsePositiveInteger('1', '--parallel'), 1);
    assert.equal(parsePositiveInteger('99', '--parallel'), 99);
  });

  test('rejects zero, negative, and non-numeric input', () => {
    assert.throws(() => parsePositiveInteger('0', '--parallel'), /must be a positive integer/);
    assert.throws(() => parsePositiveInteger('-2', '--parallel'), /must be a positive integer/);
    assert.throws(() => parsePositiveInteger('1.5', '--parallel'), /must be a positive integer/);
    assert.throws(() => parsePositiveInteger('abc', '--parallel'), /must be a positive integer/);
  });
});

describe('normalizePath', () => {
  test('returns forward-slash path unchanged', () => {
    assert.equal(normalizePath('a/b/c'), 'a/b/c');
  });

  test('collapses consecutive separators to a single forward slash', () => {
    const osSep = path.sep;
    if (osSep === '/') {
      assert.equal(normalizePath(`a${osSep}b${osSep}c`), 'a/b/c');
    } else {
      assert.equal(normalizePath('a\\b\\c'), 'a/b/c');
    }
  });
});

describe('globToRegExp', () => {
  test('matches simple file names', () => {
    const re = globToRegExp('foo.spec.ts');
    assert.equal(re.test('foo.spec.ts'), true);
    assert.equal(re.test('bar.spec.ts'), false);
  });

  test('matches with single-segment wildcards', () => {
    const re = globToRegExp('*.spec.ts');
    assert.equal(re.test('foo.spec.ts'), true);
    assert.equal(re.test('nested/foo.spec.ts'), false);
  });

  test('matches with double-star wildcards', () => {
    const re = globToRegExp('tests/**/*.spec.ts');
    assert.equal(re.test('tests/foo.spec.ts'), true);
    assert.equal(re.test('tests/sub/bar.spec.ts'), true);
    assert.equal(re.test('other/foo.spec.ts'), false);
  });

  test('escapes regex metacharacters', () => {
    const re = globToRegExp('foo+bar.spec.ts');
    assert.equal(re.test('foo+bar.spec.ts'), true);
    assert.equal(re.test('fooXbar.spec.ts'), false);
  });
});

describe('selectSections', () => {
  const sections: PlaywrightTestSection[] = [
    { id: 'smoke' },
    { id: 'api' },
    { id: 'serial-checkout', serial: true },
  ];

  test('returns all sections when no ids given', () => {
    assert.equal(selectSections(sections, []), sections);
  });

  test('returns only the requested sections in original order', () => {
    const selected = selectSections(sections, ['api', 'smoke']);
    assert.deepEqual(
      selected.map((s) => s.id),
      ['smoke', 'api'],
    );
  });

  test('throws on unknown section id', () => {
    assert.throws(() => selectSections(sections, ['nope']), /Unknown section id\(s\): nope/);
  });

  test('lists all missing ids in one error', () => {
    assert.throws(() => selectSections(sections, ['smoke', 'x', 'y']), /x, y/);
  });
});

describe('resolveSectionFiles', () => {
  const projectRoot = '/project';
  const testDirAbsolute = '/project/tests';

  test('matches by explicit testFiles', () => {
    const section: PlaywrightTestSection = {
      id: 'one',
      testFiles: ['tests/a.spec.ts'],
    };
    const discovered = [path.resolve(projectRoot, 'tests/a.spec.ts')];
    const matched = resolveSectionFiles(section, discovered, testDirAbsolute, projectRoot);
    assert.deepEqual([...matched], discovered);
  });

  test('ignores testFiles entries that do not exist in discovered list', () => {
    const section: PlaywrightTestSection = {
      id: 'one',
      testFiles: ['tests/missing.spec.ts'],
    };
    const matched = resolveSectionFiles(section, [], testDirAbsolute, projectRoot);
    assert.equal(matched.size, 0);
  });

  test('matches against testDir-relative path with testMatch', () => {
    const section: PlaywrightTestSection = {
      id: 'auth',
      testMatch: '**/auth.spec.ts',
    };
    const discovered = [
      path.resolve(projectRoot, 'tests/api/auth.spec.ts'),
      path.resolve(projectRoot, 'tests/smoke.spec.ts'),
    ];
    const matched = resolveSectionFiles(section, discovered, testDirAbsolute, projectRoot);
    assert.equal(matched.size, 1);
  });

  test('matches filename-prefix testMatch across nested directories', () => {
    const section: PlaywrightTestSection = {
      id: 'feature',
      testMatch: '**/feature-*.spec.ts',
    };
    const discovered = [
      path.resolve(projectRoot, 'tests/feature-a.spec.ts'),
      path.resolve(projectRoot, 'tests/sub/feature-b.spec.ts'),
      path.resolve(projectRoot, 'tests/smoke.spec.ts'),
    ];
    const matched = resolveSectionFiles(section, discovered, testDirAbsolute, projectRoot);
    assert.equal(matched.size, 2);
  });

  test('supports testMatch as an array of patterns', () => {
    const section: PlaywrightTestSection = {
      id: 'combo',
      testMatch: ['a.spec.ts', 'b.spec.ts'],
    };
    const discovered = [
      path.resolve(projectRoot, 'tests/a.spec.ts'),
      path.resolve(projectRoot, 'tests/b.spec.ts'),
      path.resolve(projectRoot, 'tests/c.spec.ts'),
    ];
    const matched = resolveSectionFiles(section, discovered, testDirAbsolute, projectRoot);
    assert.equal(matched.size, 2);
  });
});

describe('validateCoverage', () => {
  const projectRoot = '/project';
  const testDirAbsolute = '/project/tests';
  const makeFile = (rel: string): string => path.resolve(projectRoot, rel);

  test('flags a section that matches no discovered file', () => {
    const sections: PlaywrightTestSection[] = [{ id: 'smoke', testMatch: 'missing.spec.ts' }];
    const discovered = [makeFile('tests/a.spec.ts')];
    const result = validateCoverage(sections, discovered, testDirAbsolute, projectRoot);
    assert.equal(result.errors.length, 2);
    assert.ok(
      result.errors.some((e) => /Section "smoke" does not match any discovered spec file/.test(e)),
      'expected unmatched-section error',
    );
    assert.ok(
      result.errors.some((e) => /Unassigned spec file: tests\/a\.spec\.ts/.test(e)),
      'expected unassigned-file error',
    );
  });

  test('flags unassigned spec files', () => {
    const sections: PlaywrightTestSection[] = [{ id: 'smoke', testMatch: 'a.spec.ts' }];
    const discovered = [makeFile('tests/a.spec.ts'), makeFile('tests/b.spec.ts')];
    const result = validateCoverage(sections, discovered, testDirAbsolute, projectRoot);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /Unassigned spec file: tests\/b\.spec\.ts/);
  });

  test('flags a spec file assigned to multiple sections', () => {
    const sections: PlaywrightTestSection[] = [
      { id: 'a', testMatch: 'shared.spec.ts' },
      { id: 'b', testMatch: 'shared.spec.ts' },
    ];
    const discovered = [makeFile('tests/shared.spec.ts')];
    const result = validateCoverage(sections, discovered, testDirAbsolute, projectRoot);
    assert.equal(result.errors.length, 1);
    assert.match(
      result.errors[0],
      /Spec file assigned to multiple sections: tests\/shared\.spec\.ts -> a, b/,
    );
  });

  test('reports zero errors when each file is assigned to exactly one section', () => {
    const sections: PlaywrightTestSection[] = [
      { id: 'a', testMatch: 'a.spec.ts' },
      { id: 'b', testMatch: 'b.spec.ts' },
    ];
    const discovered = [makeFile('tests/a.spec.ts'), makeFile('tests/b.spec.ts')];
    const result = validateCoverage(sections, discovered, testDirAbsolute, projectRoot);
    assert.deepEqual(result.errors, []);
  });
});

describe('sectionArgs', () => {
  test('includes explicit testFiles entries', () => {
    const section: PlaywrightTestSection = { id: 'one', testFiles: ['tests/a.spec.ts'] };
    assert.deepEqual(sectionArgs(section), ['tests/a.spec.ts']);
  });

  test('includes testMatch patterns', () => {
    const section: PlaywrightTestSection = { id: 'one', testMatch: 'a*.spec.ts' };
    assert.deepEqual(sectionArgs(section), ['a*.spec.ts']);
  });

  test('includes testMatch array entries flattened', () => {
    const section: PlaywrightTestSection = {
      id: 'one',
      testMatch: ['a.spec.ts', 'b.spec.ts'],
    };
    assert.deepEqual(sectionArgs(section), ['a.spec.ts', 'b.spec.ts']);
  });

  test('returns empty array when no selectors are configured', () => {
    assert.deepEqual(sectionArgs({ id: 'empty' }), []);
  });
});

describe('buildSectionCommand', () => {
  const playwrightConfigPath = '/project/playwright.config.ts';
  const projectRoot = '/project';

  test('builds minimal playwright command for section with testFiles', () => {
    const section: PlaywrightTestSection = { id: 'one', testFiles: ['tests/a.spec.ts'] };
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath);
    assert.deepEqual(args, [
      'exec',
      'playwright',
      'test',
      '-c',
      playwrightConfigPath,
      'tests/a.spec.ts',
    ]);
  });

  test('appends --grep when section defines it', () => {
    const section: PlaywrightTestSection = {
      id: 'one',
      testFiles: ['tests/a.spec.ts'],
      grep: '@smoke',
    };
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath);
    assert.deepEqual(args, [
      'exec',
      'playwright',
      'test',
      '-c',
      playwrightConfigPath,
      'tests/a.spec.ts',
      '--grep',
      '@smoke',
    ]);
  });

  test('appends --project for each entry in section.projects', () => {
    const section: PlaywrightTestSection = {
      id: 'one',
      testFiles: ['tests/a.spec.ts'],
      projects: ['chromium', 'firefox'],
    };
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath);
    assert.deepEqual(args, [
      'exec',
      'playwright',
      'test',
      '-c',
      playwrightConfigPath,
      'tests/a.spec.ts',
      '--project',
      'chromium',
      '--project',
      'firefox',
    ]);
  });

  test('forwards --shard to playwright when provided', () => {
    const section: PlaywrightTestSection = { id: 'one', testFiles: ['tests/a.spec.ts'] };
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath, '1/4');
    assert.deepEqual(args, [
      'exec',
      'playwright',
      'test',
      '-c',
      playwrightConfigPath,
      'tests/a.spec.ts',
      '--shard',
      '1/4',
    ]);
  });

  test('omits --shard when not provided', () => {
    const section: PlaywrightTestSection = { id: 'one', testFiles: ['tests/a.spec.ts'] };
    const args = buildSectionCommand(section, projectRoot, playwrightConfigPath);
    assert.equal(args.includes('--shard'), false);
  });
});

describe('runConcurrentSections', () => {
  const make = (id: string): PlaywrightTestSection => ({ id });

  test('returns empty result for empty section list', async () => {
    const results = await runConcurrentSections([], 2, async () => {
      throw new Error('should not be called');
    });
    assert.deepEqual(results, []);
  });

  test('limits concurrent executions to the configured concurrency', async () => {
    let active = 0;
    let maxActive = 0;
    const sections = [make('a'), make('b'), make('c'), make('d')];
    const results = await runConcurrentSections(sections, 2, async (section) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        sectionId: section.id,
        status: 'passed' as const,
        durationMs: 5,
        exitCode: 0,
      };
    });
    assert.equal(maxActive, 2);
    assert.equal(results.length, 4);
  });

  test('never exceeds the number of sections even with high concurrency', async () => {
    let active = 0;
    let maxActive = 0;
    const sections = [make('only')];
    await runConcurrentSections(sections, 8, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { sectionId: 'only', status: 'passed' as const, durationMs: 1, exitCode: 0 };
    });
    assert.equal(maxActive, 1);
  });

  test('records failed result when runner throws', async () => {
    const sections = [make('boom')];
    const results = await runConcurrentSections(sections, 1, async () => {
      throw new Error('spawn failed');
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'failed');
    assert.equal(results[0].exitCode, null);
  });

  test('continues running remaining sections after one fails', async () => {
    const sections = [make('first'), make('second'), make('third')];
    const results = await runConcurrentSections(sections, 1, async (section) => {
      if (section.id === 'second') {
        throw new Error('boom');
      }
      return { sectionId: section.id, status: 'passed' as const, durationMs: 1, exitCode: 0 };
    });
    assert.equal(results.length, 3);
    const failed = results.find((r) => r.sectionId === 'second');
    assert.ok(failed);
    assert.equal(failed?.status, 'failed');
  });
});

describe('formatDuration', () => {
  test('formats milliseconds under one second', () => {
    assert.equal(formatDuration(0), '0ms');
    assert.equal(formatDuration(123), '123ms');
    assert.equal(formatDuration(999), '999ms');
  });

  test('formats seconds with one decimal', () => {
    assert.equal(formatDuration(1000), '1.0s');
    assert.equal(formatDuration(12_500), '12.5s');
  });

  test('formats minutes and seconds', () => {
    assert.equal(formatDuration(60_000), '1m 0s');
    assert.equal(formatDuration(125_000), '2m 5s');
  });
});
