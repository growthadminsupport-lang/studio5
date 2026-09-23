/* Local prototype. Accounts/profiles live in PostgreSQL, not in browser storage.
 * Session tokens last only for this browser tab. No password or API response logs.
 */
(() => {
  "use strict";
  // The existing API allows http://localhost:3000 as its development origin.
  if (location.hostname === "127.0.0.1" && location.port === "3000") {
    const url = new URL(location.href);
    url.hostname = "localhost";
    location.replace(url.href);
    return;
  }
  const API = "http://127.0.0.1:8000";
  // OAuth client ID เป็น public identifier ที่ต้องอยู่ใน browser; ไม่ใช่ Client Secret.
  const GOOGLE_CLIENT_ID = "852050735426-pltprtnafpb3om0nq9ibdj0bdn7mplli.apps.googleusercontent.com";
  const $ = id => document.getElementById(id);
  const SESSION_KEY = "growth_local_session_v1";
  const state = { user: null, children: [], selected: null, records: [], editing: null, epoch: 0, detailVersion: 0, listVersion: 0 };
  let pair = null, refreshFlight = null, toastTimer, googleBusy = false;
  try { pair = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { /* Storage may be disabled. */ }
  if (!pair?.access_token || !pair?.refresh_token) pair = null;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const dateLabel = value => new Date(value + "T12:00:00").toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"numeric" });
  const numeric = value => value == null ? "—" : Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  function ageLabel(birth) {
    const d = new Date(birth + "T12:00:00"), now = new Date();
    let months = (now.getFullYear()-d.getFullYear())*12 + now.getMonth()-d.getMonth();
    if (now.getDate() < d.getDate()) months--;
    months = Math.max(0, months);
    return months < 12 ? `${months} เดือน` : `${Math.floor(months/12)} ปี ${months%12} เดือน`;
  }
  function message(id, text = "") { $(id).textContent = text; $(id).hidden = !text; }
  function toast(text) { clearTimeout(toastTimer); $("toast").textContent = text; $("toast").hidden = false; toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4000); }
  function saveSession(value) {
    pair = value;
    try { value ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)) : sessionStorage.removeItem(SESSION_KEY); } catch { /* In-memory session still works. */ }
  }
  function clearSession() {
    saveSession(null);
    state.epoch++; state.detailVersion++; state.listVersion++;
    state.user = null; state.children = []; state.selected = null; state.records = [];
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    $("children-list").replaceChildren(); $("child-detail").replaceChildren(); $("account-name").textContent = "";
    $("dashboard").hidden = true; $("auth-view").hidden = false;
    $("password").value = ""; $("confirm-password").value = "";
    // Clear token keys left by the old debug page, but never clear unrelated storage.
    try { localStorage.removeItem("gt_access"); localStorage.removeItem("gt_refresh"); } catch { /* Optional cleanup. */ }
  }
  class ApiError extends Error { constructor(text, status) { super(text); this.status = status; } }
  async function request(path, { method = "GET", body, token } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    let response;
    try {
      response = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: "no-store" });
    } catch {
      throw new ApiError("เชื่อมต่อระบบไม่ได้หรือใช้เวลานานเกินไป กรุณาตรวจว่า API เปิดอยู่ แล้วรีเฟรชดูข้อมูลก่อนลองบันทึกซ้ำ", 0);
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      let text = "ระบบขัดข้องชั่วคราว กรุณาลองใหม่";
      if (response.status < 500 && typeof data?.detail === "string") text = data.detail;
      else if (response.status < 500 && typeof data?.detail?.message === "string") text = data.detail.message;
      else if (response.status === 422 && Array.isArray(data?.detail)) text = data.detail.map(item => item.msg).join("\n");
      throw new ApiError(text, response.status);
    }
    return data;
  }
  async function api(path, options = {}) {
    const epoch = state.epoch, attemptedPair = pair;
    if (!attemptedPair) throw new ApiError("กรุณาเข้าสู่ระบบก่อน", 401);
    try { return await request(path, { ...options, token: attemptedPair.access_token }); }
    catch (error) {
      if (error.status !== 401 || epoch !== state.epoch) throw error;
      try {
        // Share one refresh request so concurrent reads cannot rotate the same token twice.
        if (pair === attemptedPair) {
          if (!refreshFlight) refreshFlight = request("/api/auth/refresh", { method:"POST", body:{ refresh_token:pair.refresh_token } })
            .then(next => { if (epoch === state.epoch) saveSession(next); })
            .finally(() => { refreshFlight = null; });
          await refreshFlight;
        }
        if (epoch !== state.epoch || !pair) throw new ApiError("กรุณาเข้าสู่ระบบอีกครั้ง", 401);
        return await request(path, { ...options, token:pair.access_token });
      } catch (refreshError) {
        if (refreshError.status === 401 && epoch === state.epoch) {
          clearSession(); setMode("login"); message("auth-error", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        }
        throw refreshError;
      }
    }
  }
  let mode = "login";
  function setMode(next) {
    mode = next; const registering = next === "register";
    $("name-field").hidden = !registering; $("register-fields").hidden = !registering;
    $("login-password-hint").hidden = registering;
    $("full-name").required = registering; $("confirm-password").required = registering; $("consent").required = registering;
    $("password").minLength = registering ? 8 : 1;
    $("password").autocomplete = registering ? "new-password" : "current-password";
    $("confirm-password").setCustomValidity("");
    $("auth-title").textContent = registering ? "เริ่มบันทึกเรื่องราวของลูก" : "ยินดีต้อนรับกลับมา";
    $("auth-subtitle").textContent = registering ? "สร้างบัญชี เพื่อเก็บทุกช่วงเวลาของการเติบโต" : "มาดูการเติบโตของคนสำคัญไปด้วยกัน";
    $("auth-submit").innerHTML = registering ? 'สร้างบัญชี <span aria-hidden="true">→</span>' : 'เข้าสู่ระบบ <span aria-hidden="true">→</span>';
    for (const tab of ["login", "register"]) { $(tab+"-tab").classList.toggle("active", tab === next); $(tab+"-tab").setAttribute("aria-pressed", String(tab === next)); }
    message("auth-error");
  }
  // Block repeated submissions and modal dismissal while a write is in progress.
  async function submit(form, errorId, action) {
    if (form.dataset.busy) return;
    form.dataset.busy = "true"; message(errorId);
    const controls = [...form.querySelectorAll("button,input,select")];
    const states = controls.map(el => el.disabled);
    controls.forEach(el => { el.disabled = true; });
    $("logout").disabled = true;
    const tabs = [$("login-tab"), $("register-tab"), $("load-demo")];
    if (form.id === "auth-form") tabs.forEach(el => { el.disabled = true; });
    try { await action(); } catch (error) { message(errorId, error.message); }
    finally {
      controls.forEach((el, index) => { el.disabled = states[index]; });
      $("logout").disabled = false; tabs.forEach(el => { el.disabled = false; });
      delete form.dataset.busy;
    }
  }
  async function enterDashboard() {
    const epoch = state.epoch, user = await api("/api/auth/me");
    if (epoch !== state.epoch) return;
    state.user = user;
    $("account-name").textContent = user.full_name;
    $("password-settings").textContent = user.has_password ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน";
    $("auth-view").hidden = true; $("dashboard").hidden = false;
    $("password").value = ""; $("confirm-password").value = "";
    await loadChildren();
  }
  function openPasswordSettings() {
    if (!state.user) return;
    const hasPassword = state.user.has_password;
    $("password-form").reset(); message("password-error");
    $("account-confirm-password").setCustomValidity("");
    $("current-password-field").hidden = !hasPassword;
    $("account-current-password").required = hasPassword;
    $("password-dialog-title").textContent = hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน";
    $("password-dialog-description").textContent = hasPassword
      ? "ยืนยันรหัสเดิม แล้วตั้งรหัสใหม่สำหรับบัญชีนี้"
      : "ตั้งรหัสผ่านเพื่อให้บัญชีนี้เข้าสู่ระบบได้ทั้ง Google และอีเมล";
    $("password-save").textContent = hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน";
    $("password-dialog").showModal();
    setTimeout(() => $(hasPassword ? "account-current-password" : "account-new-password").focus(), 0);
  }
  function initializeGoogle() {
    const mount = $("google-button");
    const initialize = () => {
      if (!window.google?.accounts?.id) {
        message("google-error", "โหลดระบบ Google ไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่");
        return;
      }
      message("google-error");
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      mount.replaceChildren();
      window.google.accounts.id.renderButton(mount, {
        type: "standard", theme: "outline", size: "large", shape: "rectangular",
        text: "continue_with", logo_alignment: "left", locale: "th", width: 340,
      });
    };

    if (window.google?.accounts?.id) { initialize(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) message("google-error", "ปุ่ม Google ใช้เวลาโหลดนาน กรุณาตรวจอินเทอร์เน็ตแล้วรีเฟรชอีกครั้ง");
    }, 8000);
    script.onload = () => { settled = true; clearTimeout(timeout); initialize(); };
    script.onerror = () => {
      settled = true; clearTimeout(timeout);
      message("google-error", "โหลดปุ่ม Google ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วรีเฟรชอีกครั้ง");
    };
    document.head.appendChild(script);
  }
  async function handleGoogleCredential(response) {
    if (googleBusy) return;
    message("google-error");
    if (!response?.credential) {
      message("google-error", "Google ไม่ได้ส่งข้อมูลยืนยันตัวตนกลับมา กรุณาลองใหม่");
      return;
    }

    googleBusy = true;
    $("google-auth").setAttribute("aria-busy", "true");
    try {
      const next = await request("/api/auth/google", {
        method: "POST",
        body: {
          id_token: response.credential,
          terms_accepted: $("google-consent").checked,
        },
      });
      state.epoch++; saveSession(next); await enterDashboard();
      if (next.is_new_account) {
        toast("สร้างบัญชีด้วย Google แล้ว ตั้งรหัสผ่านเพิ่มได้หากต้องการเข้าทั้งสองทาง");
        if (!state.user?.has_password) openPasswordSettings();
      } else {
        toast("เข้าสู่ระบบด้วย Google สำเร็จ");
      }
    } catch (error) {
      message("google-error", error.message);
    } finally {
      googleBusy = false;
      $("google-auth").removeAttribute("aria-busy");
    }
  }
  function renderList() {
    $("family-count").textContent = `เด็กในความดูแล ${state.children.length} คน`;
    $("children-list").innerHTML = state.children.length ? state.children.map((child, i) => `<button type="button" class="child-card ${child.id === state.selected ? "selected" : ""}" data-child="${esc(child.id)}" aria-pressed="${child.id === state.selected}"><span class="avatar ${i%2 ? "peach" : ""}" aria-hidden="true">${esc(child.name.slice(0,1))}</span><span class="child-copy"><strong>${esc(child.name)}</strong><small>${esc(ageLabel(child.date_of_birth))} · ${child.sex === "male" ? "ชาย" : "หญิง"}</small></span><span class="card-arrow" aria-hidden="true">›</span></button>`).join("") : '<p class="small-empty">ยังไม่มีประวัติเด็ก<br>เพิ่มคนสำคัญของคุณเพื่อเริ่มบันทึก</p>';
  }
  async function loadChildren(preferred = state.selected) {
    const epoch = state.epoch, version = ++state.listVersion;
    message("dashboard-error");
    try {
      const children = await api("/api/children");
      if (epoch !== state.epoch || version !== state.listVersion) return;
      state.children = children;
      state.selected = children.some(c => c.id === preferred) ? preferred : children[0]?.id || null;
      renderList();
      if (state.selected) await selectChild(state.selected);
      else {
        state.detailVersion++; state.records = [];
        $("child-detail").innerHTML = '<div class="empty"><div class="empty-symbol" aria-hidden="true">♧</div><h2>เรื่องราวการเติบโต เริ่มต้นที่นี่</h2><p>เพิ่มชื่อและวันเกิดของลูก แล้วเริ่มเก็บบันทึกส่วนสูงและน้ำหนักไปด้วยกัน</p><button type="button" class="button primary" data-action="add">＋ เพิ่มประวัติเด็กคนแรก</button></div>';
      }
    } catch (error) { if (epoch === state.epoch && version === state.listVersion) message("dashboard-error", error.message); }
  }
  const currentChild = () => state.children.find(c => c.id === state.selected);
  async function selectChild(id) {
    state.selected = id; state.records = []; renderList();
    const version = ++state.detailVersion, epoch = state.epoch;
    $("child-detail").innerHTML = '<p class="detail-loading">กำลังโหลดประวัติ…</p>';
    try {
      const records = await api(`/api/children/${encodeURIComponent(id)}/growth`);
      if (epoch !== state.epoch || version !== state.detailVersion) return;
      state.records = records; renderDetail();
    } catch (error) {
      if (epoch === state.epoch && version === state.detailVersion) $("child-detail").innerHTML = `<div class="empty"><p>${esc(error.message)}</p><button type="button" class="button secondary" data-action="retry">ลองใหม่</button></div>`;
    }
  }
  function renderDetail() {
    const child = currentChild(); if (!child) return;
    const latest = state.records[0];
    const metrics = [["ส่วนสูงล่าสุด",latest?.height_cm,"ซม."],["น้ำหนักล่าสุด",latest?.weight_kg,"กก."],["BMI ล่าสุด",latest?.bmi,"กก./ม²"]];
    const date = latest ? dateLabel(latest.measurement_date) : "ยังไม่มีผลวัด";
    const incomplete = latest && ["height_sds","weight_sds","bmi_sds"].some(key => latest[key] == null);
    let guidance = "";
    if (incomplete) {
      // Older stored records may still contain the previous generic normal message.
      const warning = "บันทึกผลวัดแล้ว แต่ข้อมูลอ้างอิงยังไม่ครบ จึงยังสรุปเกณฑ์การเติบโตไม่ได้";
      guidance = latest.is_flagged && latest.guidance_message ? `${latest.guidance_message} / ${warning}` : warning;
    }
    else if (latest?.is_flagged) guidance = latest.guidance_message || "มีผลวัดที่ควรปรึกษาแพทย์เพิ่มเติม";
    $("child-detail").innerHTML = `<div class="panel"><div class="profile-heading"><span class="avatar" aria-hidden="true">${esc(child.name.slice(0,1))}</span><div><h2>${esc(child.name)}</h2><p>อายุ ${esc(ageLabel(child.date_of_birth))} · ${child.sex === "male" ? "ชาย" : "หญิง"}</p></div><div class="profile-actions"><button type="button" class="text-button" data-action="edit">แก้ไขประวัติ</button><button type="button" class="text-button" data-action="delete">ลบประวัติ</button></div></div><div class="profile-meta"><div><span>วันเกิด</span><strong>${esc(dateLabel(child.date_of_birth))}</strong></div><div><span>บันทึกการเติบโต</span><strong>${state.records.length} รายการ</strong></div></div></div><div class="metrics">${metrics.map(([label,value,unit]) => `<div class="metric"><span>${label}</span><strong>${numeric(value)}<small>${unit}</small></strong><p>${esc(date)}</p></div>`).join("")}</div>${guidance ? `<p class="message notice" style="margin:0 0 18px">${esc(guidance)}</p>` : ""}<div class="panel"><div class="history-heading"><div><h3>บันทึกการเติบโต</h3><p>ทุกการเปลี่ยนแปลง มีความหมาย</p></div><button type="button" class="button primary" data-action="measure">＋ เพิ่มผลวัด</button></div>${state.records.length ? `<div class="table-scroll"><table><thead><tr><th scope="col">วันที่วัด</th><th scope="col">ส่วนสูง (ซม.)</th><th scope="col">น้ำหนัก (กก.)</th><th scope="col">BMI</th></tr></thead><tbody>${state.records.map(r => `<tr><td>${esc(dateLabel(r.measurement_date))}</td><td>${numeric(r.height_cm)}</td><td>${numeric(r.weight_kg)}</td><td>${numeric(r.bmi)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty compact-empty"><div class="empty-symbol" aria-hidden="true">↗</div><h3>พร้อมบันทึกก้าวแรกแล้วหรือยัง?</h3><p>เพิ่มส่วนสูงและน้ำหนัก เพื่อเก็บประวัติการเติบโตของลูก</p></div>'}</div>`;
  }
  function openChild(edit = false) {
    const child = edit ? currentChild() : null;
    state.editing = child?.id || null;
    $("child-form").reset(); message("child-error");
    $("child-name").setCustomValidity("");
    $("child-dialog-title").textContent = edit ? "แก้ไขประวัติเด็ก" : "เพิ่มประวัติเด็ก";
    $("edit-notice").hidden = !edit;
    $("child-dob").max = today();
    if (child) { $("child-name").value = child.name; $("child-sex").value = child.sex; $("child-dob").value = child.date_of_birth; }
    $("child-dialog").showModal();
  }
  function openGrowth() {
    const child = currentChild(); if (!child) return;
    $("growth-form").reset(); message("growth-error");
    $("growth-form").dataset.childId = child.id;
    $("growth-child-name").textContent = `บันทึกผลวัดของ ${child.name}`;
    $("measurement-date").min = child.date_of_birth; $("measurement-date").max = today(); $("measurement-date").value = today();
    $("growth-dialog").showModal();
  }
  $("login-tab").addEventListener("click", () => setMode("login"));
  $("register-tab").addEventListener("click", () => setMode("register"));
  $("toggle-password").addEventListener("click", () => {
    const show = $("password").type === "password"; $("password").type = show ? "text" : "password";
    $("toggle-password").textContent = show ? "ซ่อน" : "แสดง"; $("toggle-password").setAttribute("aria-label", show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
  });
  for (const id of ["password","confirm-password"]) $(id).addEventListener("input", () => $("confirm-password").setCustomValidity(""));
  $("full-name").addEventListener("input", () => $("full-name").setCustomValidity(""));
  $("child-name").addEventListener("input", () => $("child-name").setCustomValidity(""));
  $("auth-form").addEventListener("submit", event => {
    event.preventDefault();
    const registering = mode === "register";
    if (registering && !$("full-name").value.trim()) { $("full-name").setCustomValidity("กรุณากรอกชื่อผู้ปกครอง"); $("full-name").reportValidity(); return; }
    if (registering && $("password").value !== $("confirm-password").value) { $("confirm-password").setCustomValidity("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); $("confirm-password").reportValidity(); return; }
    const body = { email:$("email").value.trim(), password:$("password").value };
    if (registering) Object.assign(body, { full_name:$("full-name").value.trim(), terms_accepted:$("consent").checked });
    submit(event.currentTarget, "auth-error", async () => {
      let next;
      try {
        next = await request(`/api/auth/${registering ? "register" : "login"}`, { method:"POST", body });
      } catch (error) {
        if (!registering && error.status === 401) {
          throw new ApiError(error.message + " หากบัญชีนี้สมัครด้วย Google ให้เข้า Google แล้วตั้งรหัสผ่านจากหน้าโปรไฟล์ก่อน", 401);
        }
        throw error;
      }
      if (registering) {
        setMode("login");
        message("auth-error", "ตรวจอีเมลเพื่อยืนยันบัญชี แล้วกรอกรหัสผ่านที่ใช้สมัครในหน้าลิงก์ยืนยัน หากไม่มีอีเมล ให้ใช้หน้าลืมรหัสผ่านของเว็บหลัก");
      } else {
        state.epoch++; saveSession(next); await enterDashboard();
        toast("เข้าสู่ระบบสำเร็จ");
      }
    });
  });
  $("load-demo").addEventListener("click", async () => {
    try {
      const response = await fetch("demo_login.local.json", { cache:"no-store" });
      if (!response.ok) throw new Error("ยังไม่มีไฟล์บัญชีตัวอย่างในเครื่องนี้ กรุณาสมัครบัญชีใหม่");
      const demo = await response.json(); setMode("login");
      $("email").value = demo.email || ""; $("password").value = demo.password || "";
      toast("กรอกบัญชีตัวอย่างแล้ว กดเข้าสู่ระบบได้เลย");
    } catch (error) { message("auth-error", error.message); }
  });
  $("password-settings").addEventListener("click", openPasswordSettings);
  for (const id of ["account-new-password","account-confirm-password"]) {
    $(id).addEventListener("input", () => $("account-confirm-password").setCustomValidity(""));
  }
  $("password-form").addEventListener("submit", event => {
    event.preventDefault();
    const newPassword = $("account-new-password").value;
    if (newPassword !== $("account-confirm-password").value) {
      $("account-confirm-password").setCustomValidity("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      $("account-confirm-password").reportValidity();
      return;
    }
    const body = { new_password:newPassword };
    if (state.user?.has_password) body.current_password = $("account-current-password").value;
    submit(event.currentTarget, "password-error", async () => {
      const result = await api("/api/auth/password/change", { method:"POST", body });
      $("password-dialog").close();
      clearSession(); setMode("login");
      message("auth-error");
      toast(result.message + " เข้าสู่ระบบใหม่ได้ทั้งด้วย Google และรหัสผ่าน");
    });
  });
  $("logout").addEventListener("click", async () => {
    $("logout").disabled = true;
    try {
      if (pair) await request("/api/auth/logout", { method:"POST", body:{refresh_token:pair.refresh_token} });
      clearSession(); setMode("login"); toast("ออกจากระบบแล้ว");
    } catch (error) { message("dashboard-error", "ยังออกจากระบบไม่สำเร็จ: " + error.message); }
    finally { $("logout").disabled = false; }
  });
  $("add-child").addEventListener("click", () => openChild());
  $("reload-children").addEventListener("click", () => loadChildren());
  $("children-list").addEventListener("click", event => { const button = event.target.closest("[data-child]"); if (button) selectChild(button.dataset.child); });
  $("child-detail").addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "add") openChild();
    if (action === "edit") openChild(true);
    if (action === "retry") selectChild(state.selected);
    if (action === "measure") openGrowth();
    if (action === "delete") {
      const child = currentChild(); if (!child) return;
      $("delete-form").dataset.childId = child.id; message("delete-error");
      $("delete-description").textContent = `คุณต้องการลบประวัติของ ${child.name} ใช่หรือไม่`;
      $("delete-dialog").showModal();
    }
  });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => { const dialog = $(button.dataset.close); if (!dialog.querySelector("form").dataset.busy) dialog.close(); }));
  document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("cancel", event => { if (dialog.querySelector("form").dataset.busy) event.preventDefault(); }));
  $("child-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("child-name").value.trim();
    if (!name) { $("child-name").setCustomValidity("กรุณากรอกชื่อเด็ก"); $("child-name").reportValidity(); return; }
    const id = state.editing, body = { name, sex:$("child-sex").value, date_of_birth:$("child-dob").value };
    submit(event.currentTarget, "child-error", async () => {
      const child = await api(id ? `/api/children/${encodeURIComponent(id)}` : "/api/children", { method:id ? "PATCH" : "POST", body });
      $("child-dialog").close(); await loadChildren(child.id); toast(id ? "แก้ไขประวัติแล้ว" : "เพิ่มประวัติเด็กแล้ว");
    });
  });
  $("growth-form").addEventListener("submit", event => {
    event.preventDefault(); const id = event.currentTarget.dataset.childId;
    const body = { measurement_date:$("measurement-date").value, height_cm:Number($("height-cm").value), weight_kg:Number($("weight-kg").value) };
    submit(event.currentTarget, "growth-error", async () => {
      await api(`/api/children/${encodeURIComponent(id)}/growth`, { method:"POST", body });
      $("growth-dialog").close(); await selectChild(id); toast("บันทึกผลวัดแล้ว");
    });
  });
  $("delete-form").addEventListener("submit", event => {
    event.preventDefault(); const id = event.currentTarget.dataset.childId;
    submit(event.currentTarget, "delete-error", async () => {
      await api(`/api/children/${encodeURIComponent(id)}`, { method:"DELETE" });
      $("delete-dialog").close(); await loadChildren(); toast("ลบประวัติเด็กแล้ว");
    });
  });
  async function boot() {
    setMode("login");
    if (location.protocol === "file:" || !["localhost","127.0.0.1"].includes(location.hostname)) {
      $("boot").hidden = true; $("auth-view").hidden = false;
      message("auth-error", "หน้านี้ใช้กับระบบในเครื่อง กรุณาเปิดผ่าน http://localhost:3000/growth_demo.html");
      $("auth-submit").disabled = true; $("google-auth").hidden = true; return;
    }
    initializeGoogle();
    if (pair) {
      try { await enterDashboard(); }
      catch (error) { $("auth-view").hidden = false; message("auth-error", error.message); }
    } else $("auth-view").hidden = false;
    $("boot").hidden = true;
  }
  boot();
})();
