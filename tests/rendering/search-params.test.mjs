import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
// Execute the real page modules with only external navigation/services/UI
// dependencies replaced. No Firebase requests, auth mutations or webhooks run.
function loadPage(path, query, suspend = false) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const compiledModule = { exports: {} };
  const pending = new Promise(() => {});
  function localRequire(name) {
    if (name === "react" || name === "react/jsx-runtime") return require(name);
    if (name === "next/navigation")
      return {
        useRouter: () => ({ push() {} }),
        useSearchParams: () => {
          if (suspend) throw pending;
          return new URLSearchParams(query);
        },
      };
    const Stub = () => React.createElement("span", null, name);
    return new Proxy(
      { __esModule: true, default: Stub },
      { get: (obj, key) => (key in obj ? obj[key] : Stub) },
    );
  }
  new Function("require", "module", "exports", outputText)(
    localRequire,
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports.default;
}
const signIn = "../../src/app/(auth)/sign-in/page.tsx";
const pricing = "../../src/app/pricing/page.tsx";
for (const [path, label] of [
  [signIn, "sign-in"],
  [pricing, "pricing"],
]) {
  test(`${label} prerender contains its loading fallback when query parameters suspend`, () => {
    const Page = loadPage(path, "", true);
    const html = renderToString(React.createElement(Page));
    assert.match(html, /role="status"/);
    assert.match(html, new RegExp(`Loading ${label}`));
  });
}
test("sign-in still renders its normal login form", () => {
  const Page = loadPage(signIn, "");
  assert.match(renderToString(React.createElement(Page)), /type="email"/);
});
test("password-reset query parameters still select the reset form", () => {
  const Page = loadPage(signIn, "mode=resetPassword&oobCode=test-only");
  assert.match(
    renderToString(React.createElement(Page)),
    /Reset Your Password/,
  );
});
for (const [step, component] of [
  ["", "landing/Pricing"],
  ["create-account", "checkout/AccountCreationForm"],
  ["business-details", "checkout/BusinessDetailsForm"],
  ["ai-review", "checkout/AIReviewForm"],
  ["checkout", "checkout/CheckoutPlaceholder"],
]) {
  test(`pricing preserves the ${step || "default"} query selection`, () => {
    const Page = loadPage(pricing, `step=${step}`);
    assert.ok(renderToString(React.createElement(Page)).includes(component));
  });
}
