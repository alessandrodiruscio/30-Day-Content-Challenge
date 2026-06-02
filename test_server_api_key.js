import fetch from "node-fetch";

async function test() {
  const res = await fetch("http://localhost:3000/api/debug-key");
  const text = await res.text();
  console.log("DEV SERVER SAW:", text);
}
test();
