import assert from "node:assert/strict";
import test from "node:test";
import { createAdminNewsUploadHandler } from "./handlers/upload.js";

const staff = {
  super_admin: { id: "admin", role: "super_admin", is_active: true },
  news_editor: { id: "writer", role: "news_editor", is_active: true },
  news_reviewer: { id: "reviewer", role: "news_reviewer", is_active: true },
};

function imageRequest() {
  const form = new FormData();
  form.append("file", new Blob(["image"], { type: "image/png" }), "article.png");
  return new Request("http://localhost/api/admin/news/upload", {
    method: "POST",
    body: form,
  });
}

test("news upload allows Writer and System Administrator but rejects Reviewer", async () => {
  let saveCalls = 0;
  const handlerFor = (role) => createAdminNewsUploadHandler({
    guard: async () => staff[role],
    saveImageFn: async (_buffer, filename, mimeType) => {
      saveCalls += 1;
      assert.equal(filename, "article.png");
      assert.equal(mimeType, "image/png");
      return { ok: true, url: "/uploads/news/article.png", filename };
    },
  });

  const reviewerResponse = await handlerFor("news_reviewer")(imageRequest());
  assert.equal(reviewerResponse.status, 403);
  assert.deepEqual(await reviewerResponse.json(), {
    error: "FORBIDDEN",
    message: "ليس لديك صلاحية لرفع صور الأخبار",
  });
  assert.equal(saveCalls, 0);

  for (const role of ["news_editor", "super_admin"]) {
    const response = await handlerFor(role)(imageRequest());
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      ok: true,
      url: "/uploads/news/article.png",
      filename: "article.png",
    });
  }
  assert.equal(saveCalls, 2);
});
