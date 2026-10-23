/**
 * Lets plain `node --test` load the app's pure TypeScript modules (no React Native imports) using
 * the TypeScript compiler that is already a dev dependency. No extra packages, no Jest/Babel.
 */
const fs = require("fs");
const ts = require("typescript");

if (!require.extensions[".ts"]) {
  require.extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
    });
    module._compile(outputText, filename);
  };
}
