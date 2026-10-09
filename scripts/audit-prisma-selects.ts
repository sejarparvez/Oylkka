import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';

/**
 * Prisma `select`/`include` audit (docs/AUDIT.md Appendix F.1).
 *
 * `SelectSubset<T, U>` maps unknown keys to `never`, and `never` is assignable
 * to `boolean`, so a typo'd or renamed field in a `select`/`include` compiles
 * cleanly and only throws at runtime (MONEY-14: `user.image` instead of
 * `imageUrl`). `tsc` cannot catch it.
 *
 * This script parses `prisma/*.prisma` for the model field and relation graph,
 * then walks `src/**` with the TypeScript compiler API. Every object literal
 * passed to a recognised `prisma.<model>.<query>(...)` call is checked: each
 * `select`/`include` key must be a field of that model, and nested relation
 * selections are followed through the relation graph.
 *
 * Usage:  bun run audit:selects
 * Exit:   0 when clean, 1 when invalid keys are found.
 */

interface ModelInfo {
  name: string;
  fields: Set<string>;
  relations: Map<string, string>;
}

const QUERY_METHODS = new Set([
  'aggregate',
  'count',
  'create',
  'createMany',
  'createManyAndReturn',
  'delete',
  'deleteMany',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'groupBy',
  'update',
  'updateMany',
  'upsert',
]);

function parseSchema(): Map<string, ModelInfo> {
  const files = readdirSync('prisma').filter((f) => f.endsWith('.prisma'));
  const blocks: { name: string; fields: string[] }[] = [];
  const modelNames = new Set<string>();

  for (const file of files) {
    const lines = readFileSync(`prisma/${file}`, 'utf8').split(/\r?\n/);
    let current: { name: string; fields: string[] } | null = null;
    for (const line of lines) {
      const open = /^\s*model\s+(\w+)\s*\{/.exec(line);
      if (open) {
        current = { name: open[1], fields: [] };
        modelNames.add(open[1]);
        continue;
      }
      if (!current) continue;
      if (/^\s*\}/.test(line)) {
        blocks.push(current);
        current = null;
        continue;
      }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
        continue;
      }
      const field = /^(\w+)\s+(\w+)/.exec(trimmed);
      if (field) current.fields.push(`${field[1]}\u0000${field[2]}`);
    }
  }

  const models = new Map<string, ModelInfo>();
  for (const block of blocks) {
    const info: ModelInfo = {
      name: block.name,
      fields: new Set(),
      relations: new Map(),
    };
    for (const entry of block.fields) {
      const [fieldName, fieldType] = entry.split('\u0000');
      info.fields.add(fieldName);
      if (modelNames.has(fieldType)) info.relations.set(fieldName, fieldType);
    }
    models.set(block.name, info);
  }
  return models;
}

const models = parseSchema();
const byAccessor = new Map<string, ModelInfo>();
for (const model of models.values()) {
  byAccessor.set(
    model.name.charAt(0).toLowerCase() + model.name.slice(1),
    model,
  );
}

const findings: { file: string; line: number; message: string }[] = [];

function propName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function report(node: ts.Node, message: string): void {
  const source = node.getSourceFile();
  findings.push({
    file: source.fileName,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    message,
  });
}

function checkCount(obj: ts.ObjectLiteralExpression, model: ModelInfo): void {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (propName(prop.name) !== 'select') continue;
    if (!ts.isObjectLiteralExpression(prop.initializer)) continue;
    for (const sub of prop.initializer.properties) {
      if (!ts.isPropertyAssignment(sub)) continue;
      const subName = propName(sub.name);
      if (subName && subName !== '_all' && !model.relations.has(subName)) {
        report(
          sub,
          `unknown relation \`${subName}\` in \`_count\` (${model.name})`,
        );
      }
    }
  }
}

/** Validate a `select`/`include` object literal against `model`. */
function checkShape(obj: ts.ObjectLiteralExpression, model: ModelInfo): void {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = propName(prop.name);
    if (!key) continue;

    if (key === '_count') {
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        checkCount(prop.initializer, model);
      }
      continue;
    }

    if (!model.fields.has(key)) {
      report(prop, `unknown field \`${key}\` on ${model.name}`);
      continue;
    }

    if (ts.isObjectLiteralExpression(prop.initializer)) {
      const target = model.relations.get(key);
      const targetModel = target ? models.get(target) : undefined;
      if (targetModel) checkObject(prop.initializer, targetModel);
    }
  }
}

/** Find and validate `select`/`include` inside a query or relation object. */
function checkObject(obj: ts.ObjectLiteralExpression, model: ModelInfo): void {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = propName(prop.name);
    if (name !== 'select' && name !== 'include') continue;
    if (ts.isObjectLiteralExpression(prop.initializer)) {
      checkShape(prop.initializer, model);
    }
  }
}

function modelFromCall(call: ts.CallExpression): ModelInfo | undefined {
  if (call.arguments.length === 0) return undefined;
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee)) return undefined;
  if (!QUERY_METHODS.has(callee.name.text)) return undefined;
  const receiver = callee.expression;
  if (!ts.isPropertyAccessExpression(receiver)) return undefined;
  return byAccessor.get(receiver.name.text);
}

function walk(node: ts.Node): void {
  if (ts.isCallExpression(node)) {
    const model = modelFromCall(node);
    const first = node.arguments[0];
    if (model && first && ts.isObjectLiteralExpression(first)) {
      checkObject(first, model);
    }
  }
  ts.forEachChild(node, walk);
}

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'generated' || entry.name === 'node_modules') continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...collect(path));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(path);
    }
  }
  return out;
}

for (const file of collect('src')) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  walk(source);
}

if (findings.length === 0) {
  // biome-ignore lint/suspicious/noConsole: CLI script output is the point
  console.log(`Prisma select audit: no invalid keys (${models.size} models).`);
  process.exit(0);
}

// biome-ignore lint/suspicious/noConsole: CLI script output is the point
console.log(`Found ${findings.length} invalid Prisma select/include key(s):`);
for (const finding of findings) {
  // biome-ignore lint/suspicious/noConsole: CLI script output is the point
  console.log(`  ${finding.file}:${finding.line}  ${finding.message}`);
}
process.exit(1);
