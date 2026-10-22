/** Syntax-aware audit of explicit keys, raw JSX copy and native accessible attributes. */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const violations = [], keys = new Set(), exemptions = [];
const brand = new Set(['Huqıq Mektebi','Atamalar','Anıqlamalar','O‘zbekcha','Qaraqalpaqsha']);
function literalKeys(node) {
  if (ts.isStringLiteral(node)) keys.add(node.text);
  else if (ts.isConditionalExpression(node)) { literalKeys(node.whenTrue); literalKeys(node.whenFalse); }
  else if (ts.isBinaryExpression(node)) { literalKeys(node.left); literalKeys(node.right); }
  else if (ts.isArrayLiteralExpression(node)) node.elements.forEach(literalKeys);
  else if (ts.isElementAccessExpression(node)) literalKeys(node.expression);
  else if (ts.isParenthesizedExpression(node)) literalKeys(node.expression);
}
function material(node) {
  for (let cur=node.parent;cur;cur=cur.parent) {
    if (ts.isJsxElement(cur) && cur.openingElement.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.text==='lang' && a.initializer?.text==='kaa')) return true;
  }
  return false;
}
function scan(file) {
  const root=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function report(node,text,kind) { return {file:file.replaceAll('\\','/'),line:root.getLineAndCharacterOfPosition(node.getStart()).line+1,text,kind}; }
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text=node.text.trim().replace(/\s+/g,' ');
      if (/[A-Za-z]{3}/.test(text)) {
        const record=report(node,text,'jsx-text');
        if (brand.has(text)||material(node)||/^[·\d\s./rem]+$/.test(text)) exemptions.push(record);
        else violations.push(record);
      }
    }
    if (ts.isJsxAttribute(node) && ['aria-label','placeholder','title','alt'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer) && /[A-Za-z]{3}/.test(node.initializer.text)) {
      const text=node.initializer.text,record=report(node,text,node.name.text);
      // Confirm's title is a documented message-key prop, translated inside that component.
      if (node.name.text==='title' && node.parent?.parent?.tagName?.getText(root)==='Confirm') { keys.add(text); exemptions.push({...record,kind:'translated-confirm-prop'}); }
      else violations.push(record);
    }
    if (ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='t'&&node.arguments[0]) literalKeys(node.arguments[0]);
    ts.forEachChild(node,visit);
  }
  visit(root);
}
function directory(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) {const file=path.join(dir,item.name);if(item.isDirectory())directory(file);else if(file.endsWith('.tsx'))scan(file);} }
directory('src');
const provider=fs.readFileSync('src/i18n/LanguageProvider.tsx','utf8');
const mutationRemoved=!/MutationObserver|createTreeWalker|localizeTree|WeakMap/.test(provider);
const fuzzyFallbackRemoved=!fs.readFileSync('src/i18n/messages.ts','utf8').includes('wordFallback');
const output={violations,exemptions,keys:[...keys].sort(),mutationRemoved,fuzzyFallbackRemoved};
fs.writeFileSync('docs/ux-audit/stage-8/source-copy-audit.json',JSON.stringify(output,null,2));
process.stdout.write(JSON.stringify({violations,explicitLiteralKeys:keys.size,mutationRemoved,fuzzyFallbackRemoved}));
if(violations.length||!mutationRemoved||!fuzzyFallbackRemoved) process.exitCode=1;
