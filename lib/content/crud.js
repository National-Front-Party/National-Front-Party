export function orderBySort() {
  return [{ sort_order: "asc" }, { id: "asc" }];
}

export function orderByCreated() {
  return [{ created_at: "desc" }, { id: "desc" }];
}

export async function withTransaction(database, callback) {
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }
  return database.$transaction(callback);
}
