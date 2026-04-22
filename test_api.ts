import { safeJson } from './src/utils/api';

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "test" })
    });
    console.log("STATUS:", res.status);
    console.log("HEADERS:", res.headers.get('content-type'));
    const text = await res.text();
    console.log("BODY:", text.slice(0, 100));
  } catch (err) {
    console.error(err);
  }
}
test();
