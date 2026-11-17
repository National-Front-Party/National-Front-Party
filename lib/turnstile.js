const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token,
  remoteIp,
  {
    secretKey = process.env.TURNSTILE_SECRET_KEY,
    fetchImpl = globalThis.fetch,
    timeoutMs = 5000,
  } = {},
) {
  if (!secretKey || !token || typeof fetchImpl !== "function") {
    return false;
  }

  const form = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, timeoutMs);
  });
  const verification = (async () => {
    const response = await fetchImpl(siteverifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.success === true;
  })();

  try {
    return await Promise.race([verification, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
