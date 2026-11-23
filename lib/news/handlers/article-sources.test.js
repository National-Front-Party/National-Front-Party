import assert from "node:assert/strict";
import test from "node:test";
import { createArticleSourcesHandler } from "./article-sources.js";

const superAdmin = { id: "admin", role: "super_admin", is_active: true };
const newsEditor = { id: "editor", role: "news_editor", is_active: true };
const newsReviewer = { id: "reviewer", role: "news_reviewer", is_active: true };

function request() {
  return new Request("http://localhost:3000/api/admin/news/article-sources");
}

test("article source list allows Admin and Writer and returns active-source service results", async () => {
  const sources = [{ id: 1, name_ar: "مصدر نشط", slug: "active" }];

  for (const staff of [superAdmin, newsEditor]) {
    const handler = createArticleSourcesHandler({
      guard: async () => staff,
      listFn: async () => sources,
    });
    const response = await handler.GET(request());

    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).sources, sources);
  }
});

test("article source list returns an empty list when there are no active sources", async () => {
  const handler = createArticleSourcesHandler({
    guard: async () => newsEditor,
    listFn: async () => [],
  });
  const response = await handler.GET(request());

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).sources, []);
});

test("article source list forbids reviewers and unauthenticated users", async () => {
  for (const [staff, expectedStatus] of [[newsReviewer, 403], [null, 401]]) {
    const handler = createArticleSourcesHandler({ guard: async () => staff });
    const response = await handler.GET(request());
    assert.equal(response.status, expectedStatus);
  }
});
