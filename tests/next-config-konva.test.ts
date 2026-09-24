import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the sketch canvas against a bundler optimisation that silently disables it.
 *
 * ---- WHAT WENT WRONG ----
 *
 * `konva` and `react-konva` were listed in `experimental.optimizePackageImports`.
 * That setting rewrites a barrel import into deep imports of the individual modules,
 * which skips react-konva's entry file — and that file has exactly two statements:
 *
 *     import 'konva';                    // registers every shape class
 *     export * from './ReactKonvaCore.js';
 *
 * The first is a bare side-effect import, and it is the ONLY thing that registers
 * `Line`, `Rect`, `Circle` and the rest onto the Konva namespace. `ReactKonvaCore`
 * imports `konva/lib/Core.js`, which contains no shapes — that split exists so
 * react-konva can offer a "minimal" build you register shapes into yourself.
 *
 * Optimising the import turns the full build into the minimal one without saying so.
 * react-konva then looks up `Konva['Line']`, finds nothing, and substitutes `Group`:
 *
 *     "Konva has no node with the type Line. Group will be used instead."
 *
 * ---- WHY THIS NEEDS A TEST ----
 *
 * A `Group` paints nothing, but it constructs fine. So the canvas still accepted
 * pointer input, still built its action list, still broadcast strokes to other
 * members — and drew absolutely nothing. It surfaced as a console *warning*, not an
 * error, and no unit test could catch it because the failure lives in the bundler
 * config rather than in any module under test.
 *
 * That is precisely the kind of regression a config assertion is for: cheap, and it
 * fails on the line that would cause it rather than three layers away.
 *
 * `AGENTS.md` §2.1 says to avoid barrel-file imports, which is why the list exists at
 * all. These two packages are a deliberate carve-out from that rule.
 */
const CONFIG_PATH = join(process.cwd(), 'next.config.ts');

describe('next.config.ts — konva must not be barrel-optimised', () => {
  const config = readFileSync(CONFIG_PATH, 'utf8');

  /** The `optimizePackageImports` array, excluding comments. */
  const optimiseList = (() => {
    const start = config.indexOf('optimizePackageImports:');
    expect(start).toBeGreaterThan(-1);
    const open = config.indexOf('[', start);
    // Walk to the matching close bracket so a comment containing ']' cannot fool us.
    let depth = 0;
    let end = open;
    for (let i = open; i < config.length; i += 1) {
      if (config[i] === '[') depth += 1;
      if (config[i] === ']') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = config.slice(open + 1, end);
    // Strip block comments, which is where the explanation lives.
    return body.replace(/\/\*[\s\S]*?\*\//g, '');
  })();

  it("does not optimise 'react-konva'", () => {
    // Optimising this skips the entry file that registers every shape, so every shape
    // silently becomes a Group and the sketch canvas draws nothing.
    expect(optimiseList).not.toMatch(/['"]react-konva['"]/);
  });

  it("does not optimise 'konva'", () => {
    // konva/lib/index.js is not a barrel: it is a single default export whose whole
    // purpose is a registration side effect. Nothing to gain, everything to lose.
    expect(optimiseList).not.toMatch(/['"]konva['"]/);
  });

  it('keeps the explanation next to the list, so the omission is not "cleaned up"', () => {
    // Without this the two absences look like oversights and get helpfully re-added.
    expect(config).toMatch(/DELIBERATELY ABSENT/);
    expect(config).toMatch(/Konva has no node with the type Line/);
  });

  it('still optimises the packages that genuinely are barrels', () => {
    // Guards against someone "fixing" this by emptying the list.
    for (const pkg of ['lucide-react', '@tanstack/react-query', 'firebase']) {
      expect(optimiseList).toContain(`'${pkg}'`);
    }
  });
});

/**
 * Pins the react-konva internals this depends on.
 *
 * If a future react-konva stops registering shapes from its entry file — or renames
 * it — the config fix above becomes wrong, and it would fail the same silent way.
 * Better to fail here, on an assertion that says what it needs.
 */
describe('react-konva registers shapes from its entry file', () => {
  it('imports konva for side effects in the module entry', () => {
    const entry = readFileSync(
      join(process.cwd(), 'node_modules', 'react-konva', 'es', 'ReactKonva.js'),
      'utf8',
    );
    // The bare import is the registration. If this line goes, shapes must be
    // registered some other way.
    expect(entry).toMatch(/import\s+['"]konva['"]/);
  });

  it('has a Core entry that deliberately does NOT register shapes', () => {
    // Documents why the entry file matters: Core is the minimal build.
    const core = readFileSync(
      join(
        process.cwd(),
        'node_modules',
        'react-konva',
        'es',
        'ReactKonvaCore.js',
      ),
      'utf8',
    );
    expect(core).toMatch(/konva\/lib\/Core/);
  });

  it('exposes Line on the Konva namespace once the full entry is loaded', async () => {
    // The actual invariant, end to end: importing react-konva must leave Konva able
    // to construct a Line. This is what was false in production.
    await import('react-konva');
    const Konva = (await import('konva')).default;
    expect(Konva.Line).toBeTypeOf('function');
    expect(Konva.Rect).toBeTypeOf('function');
    expect(Konva.Circle).toBeTypeOf('function');
  });
});
