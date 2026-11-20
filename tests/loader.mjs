import ts from 'typescript';
import { readFile } from 'node:fs/promises';
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && /\.tsx?$/.test(context.parentURL ?? '') && !/\.[a-z]+$/.test(specifier)) specifier += '.ts';
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (/\.tsx?$/.test(url)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(await readFile(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
  return next(url, context);
}
