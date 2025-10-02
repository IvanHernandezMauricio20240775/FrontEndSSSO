const Endpoint_URL = "http://localHost:8080/ActionsAuth";

export async function AuthenticationUser(user) {
  const res = await fetch(`${Endpoint_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",           // <- imprescindible para cookies
    body: JSON.stringify(user)
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// Endpoint protegido para verificar que el token se guardó
export async function AuthStatus() {
  const res = await fetch(`${Endpoint_URL}/me`, {
    method: "GET",
    credentials: "include"            
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

export async function logout() {
  const res = await fetch(`${Endpoint_URL}/logout`, {
    method: "POST",
    credentials: "include"
  });
  return res.ok;
}
