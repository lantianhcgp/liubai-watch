#!/usr/bin/env node
'use strict';
// Build host only. Never import/copy this parser into the watch payload.
// Receive complete JS source through stdin; emit positions/counts, never code.
const fs = require('node:fs');
const acorn = require('acorn');
if (acorn.version !== '8.19.0') throw new Error('Unexpected zero-regexp parser version');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));

function staticString(node) {
  if (node && node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node && node.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left), right = staticString(node.right);
    if (left !== null && right !== null) return left + right;
  }
  return null;
}

const rows = [];
for (const [file, source] of Object.entries(input)) {
  if (typeof source !== 'string') throw new Error('Invalid scanner source input');
  const row = {file, regexp_literals: [], regexp_references: []};
  let tree;
  try {
    tree = acorn.parse(source, {ecmaVersion: 5, sourceType: 'script', locations: true});
  } catch (error) {
    row.parse_error = {line: error.loc ? error.loc.line : 0,
      column: error.loc ? error.loc.column + 1 : 0};
    rows.push(row);
    continue;
  }
  const pending = [tree];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    const location = node.loc ? {line: node.loc.start.line, column: node.loc.start.column + 1} : null;
    if (node.type === 'Literal' && node.regex) row.regexp_literals.push(location);
    if (node.type === 'Identifier' && node.name === 'RegExp') row.regexp_references.push(location);
    if (node.type === 'MemberExpression' && node.computed && staticString(node.property) === 'RegExp')
      row.regexp_references.push(location);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'regex') continue;
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  for (const key of ['regexp_literals', 'regexp_references'])
    row[key].sort((a, b) => a.line - b.line || a.column - b.column);
  rows.push(row);
}
process.stdout.write(JSON.stringify({parser: 'acorn@8.19.0/es5', rows}));
