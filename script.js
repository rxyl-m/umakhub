/* =========================================================
   iAcademy Lost & Found — script.js  (Merged & Upgraded)
   Features: Admin power granting, strong password policy,
             text-to-voice, notifications, dark/light mode,
             terms acceptance, admin approval workflow
   ========================================================= */

const ADMIN_EMAIL      = "admin@umak.edu.ph";
const ADMIN_PASSWORD   = "onlyadmincanaccessthis";
const STORAGE_USER     = "lf_user";
const STORAGE_ACTIVITY = "lf_activity";
const STORAGE_THEME    = "lf_theme";
const STORAGE_NOTIFS   = "lf_notifications";

/* ════════════════════════════════════════════════════════
   THEME (dark / light / logo swap)
   ════════════════════════════════════════════════════════ */
function applyTheme() {
    const saved = localStorage.getItem(STORAGE_THEME) || 'dark';
    const isLight = saved === 'light';
    document.body.classList.toggle('light-mode', isLight);
    document.querySelectorAll('.theme-icon').forEach(icon => {
        icon.className = isLight ? 'ph ph-sun theme-icon' : 'ph ph-moon theme-icon';
    });
    document.querySelectorAll('.brand-logo').forEach(img => {
        img.src = isLight ? 'lnflogo.png' : 'lnflogo.png';
    });
}

function setupThemeToggle() {
    applyTheme();
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.onclick = () => {
            const isLight = document.body.classList.toggle('light-mode');
            localStorage.setItem(STORAGE_THEME, isLight ? 'light' : 'dark');
            applyTheme();
        };
    });
}

/* ════════════════════════════════════════════════════════
   SESSION
   ════════════════════════════════════════════════════════ */
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_USER)) ?? null; }
    catch { return null; }
}
function setCurrentUser(u) { localStorage.setItem(STORAGE_USER, JSON.stringify(u)); }

function ensureLogin(role) {
    const user = getCurrentUser();
    if (!user) { window.location.href = "login.html"; return null; }
    if (role && user.role !== role) {
        window.location.href = user.role === "admin" ? "adminpage.html" : "memberpage.html";
        return null;
    }
    return user;
}

function logout() {
    showConfirm("Sign Out", "Are you sure you want to sign out of your account?", "Sign Out", true, () => {
        localStorage.removeItem(STORAGE_USER);
        window.location.href = "login.html";
    });
}

/* ════════════════════════════════════════════════════════
   PASSWORD VALIDATION
   ════════════════════════════════════════════════════════ */
function isStrongPassword(pw) {
    return pw.length >= 8 &&
           /[A-Z]/.test(pw) &&
           /[0-9]/.test(pw) &&
           /[^A-Za-z0-9]/.test(pw);
}

/* ════════════════════════════════════════════════════════
   NOTIFICATIONS (localStorage-based)
   ════════════════════════════════════════════════════════ */
function getNotifications() {
    try { return JSON.parse(localStorage.getItem(STORAGE_NOTIFS)) || []; }
    catch { return []; }
}
function addNotification(text, type = 'info') {
    const notifs = getNotifications();
    notifs.unshift({ id: `n-${Date.now()}`, text, type, read: false, time: new Date().toISOString() });
    localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifs.slice(0, 50)));
}
function markAllRead() {
    const notifs = getNotifications().map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifs));
}
function renderNotifDropdown() {
    const notifs    = getNotifications();
    const unread    = notifs.filter(n => !n.read).length;
    const countEl   = document.getElementById('notificationCount');
    if (countEl) countEl.textContent = unread;

    let dropdown = document.getElementById('notifDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'notifDropdown';
        dropdown.className = 'notif-dropdown hidden';
        document.querySelector('.notif-bell-wrap')?.appendChild(dropdown);
    }

    dropdown.innerHTML = `
        <div class="notif-header">
            Notifications
            <button class="button sm secondary" onclick="markAllRead(); renderNotifDropdown();">
                Mark all read
            </button>
        </div>
        <div class="notif-list">
            ${notifs.length ? notifs.map(n => `
                <div class="notif-item ${n.read ? '' : 'unread'}">
                    ${n.read ? '' : '<div class="notif-dot"></div>'}
                    <div>
                        <div class="notif-text">${esc(n.text)}</div>
                        <div class="notif-time">${new Date(n.time).toLocaleString()}</div>
                    </div>
                </div>`).join('') :
            '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem;">No notifications yet.</div>'}
        </div>`;
}

function setupNotifBell() {
    const bell = document.getElementById('notificationBell');
    if (!bell) return;
    renderNotifDropdown();

    bell.onclick = (e) => {
        e.stopPropagation();
        const dd = document.getElementById('notifDropdown');
        if (!dd) return;
        const isHidden = dd.classList.contains('hidden');
        dd.classList.toggle('hidden', !isHidden);
        if (isHidden) { markAllRead(); renderNotifDropdown(); }
    };
    document.addEventListener('click', () => {
        document.getElementById('notifDropdown')?.classList.add('hidden');
    });
}

/* ════════════════════════════════════════════════════════
   TEXT-TO-SPEECH
   ════════════════════════════════════════════════════════ */
let _ttsUtterance = null;
function speakText(text, btn) {
    if (!('speechSynthesis' in window)) {
        showToast('Text-to-speech not supported in this browser.', 'error'); return;
    }
    window.speechSynthesis.cancel();
    if (btn?.classList.contains('speaking')) {
        btn.classList.remove('speaking');
        btn.innerHTML = '<i class="ph ph-speaker-high"></i> Read aloud';
        return;
    }
    document.querySelectorAll('.tts-btn').forEach(b => {
        b.classList.remove('speaking');
        b.innerHTML = '<i class="ph ph-speaker-high"></i> Read aloud';
    });
    _ttsUtterance = new SpeechSynthesisUtterance(text);
    _ttsUtterance.rate  = 0.95;
    _ttsUtterance.pitch = 1;
    _ttsUtterance.onend = () => {
        btn?.classList.remove('speaking');
        if (btn) btn.innerHTML = '<i class="ph ph-speaker-high"></i> Read aloud';
    };
    window.speechSynthesis.speak(_ttsUtterance);
    btn?.classList.add('speaking');
    if (btn) btn.innerHTML = '<i class="ph ph-stop-circle"></i> Stop';
}

function injectTTSButtons() {
    document.querySelectorAll('.item-card:not(.tts-injected)').forEach(card => {
        card.classList.add('tts-injected');
        const text = card.querySelector('h3')?.textContent + '. ' +
                     (card.querySelector('p')?.textContent || '') + '. ' +
                     (card.querySelector('dl')?.textContent || '');
        const btn = document.createElement('button');
        btn.className = 'tts-btn';
        btn.innerHTML = '<i class="ph ph-speaker-high"></i> Read aloud';
        btn.type = 'button';
        btn.onclick = () => speakText(text.replace(/\s+/g,' ').trim(), btn);
        const header = card.querySelector('.item-header');
        if (header) header.appendChild(btn);
    });
}

/* ════════════════════════════════════════════════════════
   IMAGE LIGHTBOX
   ════════════════════════════════════════════════════════ */
function showImageLightbox(url, alt) {
    // Inject keyframe if not already present
    if (!document.getElementById('lightbox-style')) {
        const style = document.createElement('style');
        style.id = 'lightbox-style';
        style.textContent = `
            @keyframes lbFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes lbZoomIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
            .lb-overlay { animation: lbFadeIn 0.2s ease; }
            .lb-img-wrap { animation: lbZoomIn 0.22s cubic-bezier(0.175,0.885,0.32,1.275); }
            .lb-close-btn:hover { background: var(--accent, #6366f1) !important; border-color: var(--accent, #6366f1) !important; transform: scale(1.1); }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.88);
        display: flex; align-items: center; justify-content: center;
        cursor: zoom-out; padding: 20px; box-sizing: border-box;
    `;

    overlay.innerHTML = `
        <div class="lb-img-wrap" style="position:relative; max-width:90vw; max-height:90vh; cursor:default;" onclick="event.stopPropagation()">
            <img src="${url}" alt="${alt}"
                 style="max-width:88vw; max-height:82vh; border-radius:12px;
                        box-shadow:0 24px 80px rgba(0,0,0,0.7);
                        object-fit:contain; display:block;">
            <button class="lb-close-btn"
                    style="position:absolute; top:-14px; right:-14px;
                           width:36px; height:36px; border-radius:50%;
                           background:var(--bg-raised,#1e1e2e);
                           border:2px solid var(--border,rgba(255,255,255,0.15));
                           color:var(--text-primary,white); font-size:1rem;
                           cursor:pointer; display:flex; align-items:center;
                           justify-content:center; transition:all 0.15s ease;
                           box-shadow:0 4px 12px rgba(0,0,0,0.4);"
                    onclick="document.querySelector('.lb-overlay').remove()"
                    title="Close">
                <i class="ph ph-x"></i>
            </button>
            <div style="margin-top:10px; text-align:center;
                        font-size:0.8rem; color:rgba(255,255,255,0.5);
                        font-family:var(--font-body,sans-serif);">
                ${alt} &nbsp;·&nbsp; Click outside to close
            </div>
        </div>`;

    overlay.onclick = () => overlay.remove();

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
}

/* ════════════════════════════════════════════════════════
   DB NORMALIZERS
   ════════════════════════════════════════════════════════ */
const toItem    = r => ({ id:r.id, name:r.name, category:r.category, itemType:r.item_type,  description:r.description, location:r.location, date:r.date, contact:r.contact, status:r.status, imageUrl: r.image_url });
const toRequest = r => ({ id:r.id, name:r.name, category:r.category, itemType:r.item_type,  description:r.description, location:r.location, date:r.date, contact:r.contact, requestedBy:r.requested_by, status:r.status, imageUrl: r.image_url });
const toClaim   = r => ({ id:r.id, itemId:r.item_id, name:r.name, category:r.category, itemType:r.item_type, description:r.description, location:r.location, date:r.date, contact:r.contact, requestedBy:r.requested_by, status:r.status, imageUrl: r.image_url });
const toUser    = r => ({ id:r.id, email:r.email, name:r.name, role:r.role, password:r.password, joinedAt:r.created_at });

/* ════════════════════════════════════════════════════════
   DB: ITEMS
   ════════════════════════════════════════════════════════ */
async function dbGetItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(toItem);
}
async function dbInsertItem(item) {
    const { error } = await supabaseClient.from("items").insert([{
        id: item.id, name: item.name, category: item.category, item_type: item.itemType,
        description: item.description, location: item.location, date: item.date,
        contact: item.contact, status: "Approved",
        image_url: item.imageUrl
    }]);
    if (error) throw error;
}
async function dbUpdateItem(id, fields) {
    const map = {};
    if (fields.name        !== undefined) map.name        = fields.name;
    if (fields.category    !== undefined) map.category    = fields.category;
    if (fields.description !== undefined) map.description = fields.description;
    if (fields.location    !== undefined) map.location    = fields.location;
    if (fields.contact     !== undefined) map.contact     = fields.contact;
    if (fields.status      !== undefined) map.status      = fields.status;
    if (fields.itemType    !== undefined) map.item_type   = fields.itemType;
    const { error } = await supabaseClient.from("items").update(map).eq("id", id);
    if (error) throw error;
}
async function dbDeleteItem(id) {
    const { error } = await supabaseClient.from("items").delete().eq("id", id);
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   DB: REQUESTS
   ════════════════════════════════════════════════════════ */
async function dbGetRequests(userEmail = null) {
    let q = supabaseClient.from("requests").select("*").order("created_at", { ascending: false });
    if (userEmail) q = q.eq("requested_by", userEmail);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(toRequest);
}
async function dbInsertRequest(req) {
    const { error } = await supabaseClient.from("requests").insert([{
        id: req.id, name: req.name, category: req.category, item_type: req.itemType,
        description: req.description, location: req.location, date: req.date,
        contact: req.contact, requested_by: req.requestedBy, status: "pending",
        image_url: req.image_url
    }]);
    if (error) throw error;
}
async function dbUpdateRequestStatus(id, status) {
    const { error } = await supabaseClient.from("requests").update({ status }).eq("id", id);
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   DB: CLAIMS
   ════════════════════════════════════════════════════════ */
async function dbGetClaims(userEmail = null) {
    let q = supabaseClient.from("claims").select("*").order("created_at", { ascending: false });
    if (userEmail) q = q.eq("requested_by", userEmail);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(toClaim);
}
async function dbInsertClaim(claim) {
    const { error } = await supabaseClient.from("claims").insert([{
        id: claim.id, item_id: claim.itemId, name: claim.name,
        category: claim.category, item_type: claim.itemType,
        description: claim.description, location: claim.location,
        date: claim.date, contact: claim.contact,
        requested_by: claim.requestedBy, status: "pending",
        image_url: claim.imageUrl
    }]);
    if (error) throw error;
}
async function dbUpdateClaimStatus(id, status) {
    const { error } = await supabaseClient.from("claims").update({ status }).eq("id", id);
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   DB: COMMENTS
   ════════════════════════════════════════════════════════ */
async function dbGetComments(itemId = null) {
    try {
        let q = supabaseClient.from("comments").select("*").order("created_at", { ascending: true });
        if (itemId) q = q.eq("item_id", itemId);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn("Comments unavailable (table may not exist yet):", err);
        return [];
    }
}
async function dbInsertComment(comment) {
    const { error } = await supabaseClient.from("comments").insert([{
        item_id:    comment.itemId,
        user_email: comment.userEmail,
        user_name:  comment.userName,
        content:    comment.content
    }]);
    if (error) throw error;
}

async function dbDeleteComment(commentId) {
    const { error } = await supabaseClient
        .from("comments")
        .delete()
        .eq("id", commentId);
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   DB: USERS
   ════════════════════════════════════════════════════════ */
async function dbGetUsers() {
    const { data, error } = await supabaseClient.from("users").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(toUser);
}
async function dbGetUserByEmail(email) {
    const { data, error } = await supabaseClient
        .from("users").select("*").eq("email", email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return data ? toUser(data) : null;
}
async function dbInsertUser(user) {
    const { error } = await supabaseClient.from("users").insert([{
        email: user.email.toLowerCase(),
        name: user.name,
        role: user.role || "member",
        password: user.password
    }]);
    if (error) throw error;
}
async function dbDeleteUser(email) {
    const { error } = await supabaseClient.from("users").delete().eq("email", email.toLowerCase());
    if (error) throw error;
}
async function dbUpdateUserRole(email, role) {
    const { error } = await supabaseClient.from("users").update({ role }).eq("email", email.toLowerCase());
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   DB: MESSAGES (CHAT)
   ════════════════════════════════════════════════════════ */
async function dbGetMessages(userEmail1, userEmail2) {
    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .or(`and(sender_email.eq.${userEmail1},receiver_email.eq.${userEmail2}),and(sender_email.eq.${userEmail2},receiver_email.eq.${userEmail1})`)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
}
async function dbSendMessage(sender, receiver, content) {
    const { error } = await supabaseClient.from("messages").insert([{
        sender_email: sender, receiver_email: receiver, content: content
    }]);
    if (error) throw error;
}
async function dbDeleteMessages(userEmail1, userEmail2) {
    const { error: err1 } = await supabaseClient.from("messages").delete().match({ sender_email: userEmail1, receiver_email: userEmail2 });
    if (err1) throw err1;
    const { error: err2 } = await supabaseClient.from("messages").delete().match({ sender_email: userEmail2, receiver_email: userEmail1 });
    if (err2) throw err2;
}
function subscribeToMessages(currentUserEmail, onNewMessage) {
    supabaseClient
        .channel('chat-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new;
            if (newMsg.sender_email === currentUserEmail || newMsg.receiver_email === currentUserEmail) {
                onNewMessage(newMsg);
            }
        })
        .subscribe();
}
async function dbGetChatRequests() {
    const { data, error } = await supabaseClient.from("chat_requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}
async function dbUpdateChatRequestStatus(id, status) {
    const { error } = await supabaseClient.from("chat_requests").update({ status }).eq("id", id);
    if (error) throw error;
}

/* ════════════════════════════════════════════════════════
   ACTIVITY LOG
   ════════════════════════════════════════════════════════ */
const ACTIVITY_ICONS = {
    signup:           "<i class='ph ph-user-plus'></i>",
    login:            "<i class='ph ph-sign-in'></i>",
    post_request:     "<i class='ph ph-file-text'></i>",
    post_approved:    "<i class='ph ph-check-circle'></i>",
    post_rejected:    "<i class='ph ph-x-circle'></i>",
    claim_request:    "<i class='ph ph-hand-grabbing'></i>",
    claim_approved:   "<i class='ph ph-check-circle'></i>",
    claim_rejected:   "<i class='ph ph-x-circle'></i>",
    item_edited:      "<i class='ph ph-pencil-simple'></i>",
    item_deleted:     "<i class='ph ph-trash'></i>",
    activity_cleared: "<i class='ph ph-broom'></i>",
    admin_granted:    "<i class='ph ph-shield-star'></i>",
    admin_revoked:    "<i class='ph ph-shield-slash'></i>",
};

async function logActivity(type, detail) {
    try {
        await supabaseClient.from('activity_log').insert([{
            id: `act-${Date.now()}`,
            type: type,
            detail: detail,
            timestamp: new Date().toISOString()
        }]);
    } catch (err) {
        console.error("Failed to sync activity log:", err);
    }
}

/* ════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════ */
function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// NEW: Converts plain text URLs into clickable links
function linkify(text) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        // Uses your UMak Hub accent color and ensures links open in a new tab safely
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-light); text-decoration: underline; text-underline-offset: 2px;">${url}</a>`;
    });
}
function categoryTag(cat) {
    if (cat === "Showcase") return `<span class="tag tag-found"><i class='ph ph-star'></i> Showcase</span>`;
    if (cat === "Question") return `<span class="tag tag-pending"><i class='ph ph-question'></i> Question</span>`;
    return `<span class="tag tag-claimed"><i class='ph ph-chat-text'></i> General</span>`;
}
function statusTag(status) {
    const map = {
        pending:  ["tag-pending",  "<i class='ph ph-hourglass-high'></i> Pending"],
        approved: ["tag-approved", "<i class='ph ph-check-circle'></i> Approved"],
        rejected: ["tag-rejected", "<i class='ph ph-x-circle'></i> Rejected"],
        Approved: ["tag-approved", "<i class='ph ph-check-circle'></i> Approved"],
        Claimed:  ["tag-claimed",  "<i class='ph ph-handshake'></i> Claimed"],
    };
    const [cls, label] = map[status] || ["tag-pending", esc(status)];
    return `<span class="tag ${cls}">${label}</span>`;
}
function itemTypeTag(itemType) {
    if (!itemType) return "";
    return `<span class="tag tag-type">${esc(itemType)}</span>`;
}
function emptyState(msg) { return `<div class="empty-state">${esc(msg)}</div>`; }
function loadingState(msg = "Loading…") { return `<div class="empty-state loading" style="opacity:.6;">${esc(msg)}</div>`; }
function showMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = type === "error" ? "error-message" : "success-message";
}

/* ════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════ */
function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "error" ? "<i class='ph ph-warning-circle'></i>" : "<i class='ph ph-check-circle'></i>";
    toast.innerHTML = `${icon} <span>${esc(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3900);
}

/* ════════════════════════════════════════════════════════
   CONFIRM MODAL
   ════════════════════════════════════════════════════════ */
function showConfirm(title, message, confirmText, isDanger, onConfirm) {
    const overlay  = document.createElement("div");
    overlay.className = "modal";
    overlay.style.zIndex = "1000";
    const btnClass = isDanger ? "danger" : "primary";
    const icon     = isDanger ? "<i class='ph ph-warning-circle'></i>" : "<i class='ph ph-question'></i>";
    overlay.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-panel" style="max-width:380px;text-align:center;padding:32px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <div style="font-size:3.5rem;color:${isDanger ? "var(--red)" : "var(--accent)"};margin-bottom:12px;animation:scaleIn 0.3s ease;">${icon}</div>
            <h2 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:8px;">${esc(title)}</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:24px;line-height:1.5;">${esc(message)}</p>
            <div style="display:flex;gap:10px;justify-content:center;">
                <button class="button secondary" id="confirmCancel" style="flex:1;">Cancel</button>
                <button class="button ${btnClass}" id="confirmAction" style="flex:1;">${esc(confirmText)}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.classList.add("hidden"); setTimeout(() => overlay.remove(), 250); };
    overlay.querySelector("#confirmCancel").onclick  = close;
    overlay.querySelector(".modal-backdrop").onclick = close;
    overlay.querySelector("#confirmAction").onclick  = () => { close(); onConfirm(); };
}

/* ════════════════════════════════════════════════════════
   CARD RENDERERS  (images are clickable → lightbox)
   ════════════════════════════════════════════════════════ */
function _buildImgHtml(imageUrl, name) {
    if (!imageUrl) return '';
    return `
    <div class="card-img-thumb"
         onclick="showImageLightbox('${imageUrl.replace(/'/g,"\\'")}','${esc(name).replace(/'/g,"\\'")}')">
        <img src="${esc(imageUrl)}" alt="${esc(name)}">
        <div class="card-img-overlay">
            <i class="ph ph-magnifying-glass-plus"></i>
            <span>View Image</span>
        </div>
    </div>`;
}

function renderItemCard(item, actionsHtml = "") {
    // 1. Smart Name Filter
    let authorName = item.contact || "Member";
    
    if (authorName.toLowerCase().includes("admin")) {
        authorName = "Admin"; // Forces all admin variations to just "Admin"
    } else if (authorName.includes("@")) {
        authorName = authorName.split("@")[0]; // Converts "rueljr@gmail.com" to "rueljr"
    }

    const avatarLetter = authorName.slice(0, 1).toUpperCase();

    return `
    <article class="card item-card" data-item-type="${esc(item.category||"")}" data-name="${esc((item.name||"").toLowerCase())}">
        <div class="item-header">
            <div style="display:flex; gap:8px; align-items: center; flex-wrap: wrap;">
                
                <div style="display:flex; align-items:center; gap:6px; margin-right: 4px;">
                    <div class="profile-avatar" style="width:26px; height:26px; font-size:0.75rem; border-radius:6px; background: var(--bg-raised); border: 1px solid var(--border); color: var(--accent);">${esc(avatarLetter)}</div>
                    
                    <span style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">${esc(authorName)}</span>
                </div>
                
                ${categoryTag(item.category)}
                ${statusTag(item.status || "Approved")}
            </div>
        </div>

        <div style="padding: 0 20px 12px 20px;">
            <h3 style="font-size: 1.3rem; font-weight: 800; margin: 8px 0 4px 0;">${esc(item.name)}</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary); white-space: pre-wrap;">${linkify(esc(item.description))}</p>
        </div>

        ${_buildImgHtml(item.imageUrl, item.name)}

        <div class="card-content-footer">
            ${actionsHtml}
        </div>
    </article>`;
}

function renderRequestCard(request, actionsHtml = "") {
    // 1. Smart Name Filter
    let authorName = request.contact || request.requestedBy || "Member";
    
    if (authorName.toLowerCase().includes("admin")) {
        authorName = "Admin";
    } else if (authorName.includes("@")) {
        authorName = authorName.split("@")[0];
    }

    const avatarLetter = authorName.slice(0, 1).toUpperCase();

    return `
    <article class="card item-card" data-item-type="${esc(request.category||"")}" data-name="${esc((request.name||"").toLowerCase())}">
        <div class="item-header">
            <div style="display:flex; gap:8px; align-items: center; flex-wrap: wrap;">
                
                <div style="display:flex; align-items:center; gap:6px; margin-right: 4px;">
                    <div class="profile-avatar" style="width:26px; height:26px; font-size:0.75rem; border-radius:6px; background: var(--bg-raised); border: 1px solid var(--border); color: var(--accent);">${esc(avatarLetter)}</div>
                    
                    <span style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">${esc(authorName)}</span>
                </div>
                
                ${categoryTag(request.category)}
                ${statusTag(request.status || "Approved")}
            </div>
        </div>
        ${_buildImgHtml(request.imageUrl, request.name)}
        <h3 style="font-size: 1.2rem; margin: 10px 0 5px 0; padding: 0 20px;">${esc(request.name)}</h3>
        <p style="white-space: pre-wrap; font-size: 0.95rem; padding: 0 20px;">${linkify(esc(request.description))}</p>
        ${actionsHtml}
    </article>`;
}

function renderClaimCard(claim, actionsHtml = "") {
    return `
    <article class="card item-card">
        <div class="item-header">
            ${categoryTag(claim.category)}
            ${itemTypeTag(claim.itemType)}
            ${statusTag(claim.status)}
        </div>
        ${_buildImgHtml(claim.imageUrl, claim.name)}
        <h3>${esc(claim.name)}</h3>
        <p>${esc(claim.description)}</p>
        <dl>
            <div><dt>Location</dt><dd>${esc(claim.location)}</dd></div>
            <div><dt>Date</dt><dd>${esc(claim.date)}</dd></div>
            <div><dt>Contact</dt><dd>${esc(claim.contact)}</dd></div>
            <div><dt>Claimed by</dt><dd>${esc(claim.requestedBy)}</dd></div>
        </dl>
        ${actionsHtml}
    </article>`;
}

/* ════════════════════════════════════════════════════════
   FAB
   ════════════════════════════════════════════════════════ */
function toggleFab() {
    const opts = document.getElementById("fabOptions");
    const main = document.getElementById("fabMain");
    if (!opts) return;
    const isOpen = opts.classList.contains("open");
    opts.classList.toggle("open", !isOpen);
    main.classList.toggle("open", !isOpen);
}
function closeFab() {
    document.getElementById("fabOptions")?.classList.remove("open");
    document.getElementById("fabMain")?.classList.remove("open");
}
document.addEventListener("click", e => {
    const fab = document.querySelector(".fab-container");
    if (fab && !fab.contains(e.target)) closeFab();
});

/* ════════════════════════════════════════════════════════
   LOGIN / SIGN UP
   ════════════════════════════════════════════════════════ */
function initLogin() {
    applyTheme();
    let isLoginDirty = false;
    document.getElementById("loginForm")?.addEventListener("input",  () => isLoginDirty = true);
    document.getElementById("signupForm")?.addEventListener("input", () => isLoginDirty = true);

    document.querySelectorAll(".form-actions a.button.secondary").forEach(btn => {
        btn.addEventListener("click", e => {
            if (isLoginDirty) {
                e.preventDefault();
                showConfirm("Go Back?", "Any info you've entered will be lost. Continue?", "Go Back", true, () => {
                    window.location.href = btn.href;
                });
            }
        });
    });

    document.querySelectorAll(".auth-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;
            document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            document.querySelectorAll(".auth-form").forEach(f => {
                f.classList.toggle("hidden", f.dataset.form !== target);
            });
            const isSignIn = target === "signin";
            const h = document.getElementById("authHeading");
            const p = document.getElementById("authSubheading");
            if (h) h.textContent = isSignIn ? "Welcome back" : "Create account";
            if (p) p.textContent = isSignIn
                ? "Sign in to access the Lost & Found system."
                : "Register to browse and post items.";
        });
    });

    document.getElementById("loginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const errorEl   = document.getElementById("loginError");
        const submitBtn = e.target.querySelector("button[type=submit]");
        const email     = document.getElementById("email").value.trim();
        const password  = document.getElementById("password").value;
        if (errorEl) { errorEl.textContent = ""; errorEl.className = ""; }
        if (!email || !password) { showMsg(errorEl, "Please enter email and password.", "error"); return; }

        if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            setCurrentUser({ email, name: "System Admin", role: "admin" });
            logActivity("login", "Admin signed in");
            window.location.href = "adminpage.html";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = "<i class='ph ph-circle-notch'></i> Signing in…";
        try {
            const found = await dbGetUserByEmail(email);
            if (!found)                     { showMsg(errorEl, "No account found with that email. Please sign up first.", "error"); return; }
            if (found.password !== password) { showMsg(errorEl, "Incorrect password.", "error"); return; }
            isLoginDirty = false;
            setCurrentUser({ email: found.email, name: found.name, role: found.role || "member" });
            logActivity("login", `${found.name} signed in`);
            window.location.href = found.role === "admin" ? "adminpage.html" : "memberpage.html";
        } catch (err) {
            showMsg(errorEl, "Could not connect. Please try again.", "error");
            console.error(err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<i class='ph ph-sign-in'></i> Sign In";
        }
    });

    document.getElementById("signupForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const errEl     = document.getElementById("signupError");
        const succEl    = document.getElementById("signupSuccess");
        const submitBtn = e.target.querySelector("button[type=submit]");
        if (errEl)  { errEl.textContent  = ""; errEl.className  = ""; }
        if (succEl) { succEl.textContent = ""; succEl.className = ""; }

        const firstName = document.getElementById("signupFirstName").value.trim();
        const lastName  = document.getElementById("signupLastName").value.trim();
        const email     = document.getElementById("signupEmail").value.trim();
        const password  = document.getElementById("signupPassword").value;
        const confirm   = document.getElementById("signupConfirm").value;
        const termsOk   = document.getElementById("termsCheck")?.checked;

        if (!firstName||!lastName||!email||!password||!confirm) { showMsg(errEl,"Please fill in all fields.","error"); return; }
        if (!isStrongPassword(password)) { showMsg(errEl,"Password must be at least 8 characters and include an uppercase letter, a number, and a special character.","error"); return; }
        if (password !== confirm)  { showMsg(errEl, "Passwords do not match.", "error"); return; }
        if (!termsOk)              { showMsg(errEl, "Please accept the Terms & Conditions before signing up.", "error"); return; }
        const emailLower = email.toLowerCase();
        if (!emailLower.endsWith('@gmail.com') && !emailLower.endsWith('@umak.edu.ph')) {
            showMsg(errEl, "Please use a valid @gmail.com or @umak.edu.ph email address.", "error"); return;
        }
        if (email.toLowerCase() === ADMIN_EMAIL) { showMsg(errEl, "That email is reserved.", "error"); return; }

        submitBtn.disabled = true;
        submitBtn.innerHTML = "<i class='ph ph-circle-notch'></i> Creating account…";
        try {
            const existing = await dbGetUserByEmail(email);
            if (existing) { showMsg(errEl, "An account with that email already exists.", "error"); return; }
            const newUser = { email, name:`${firstName} ${lastName}`, password, role:"member" };
            await dbInsertUser(newUser);
            logActivity("signup", `${newUser.name} created an account`);
            addNotification(`New member registered: ${newUser.name}`, 'info');
            isLoginDirty = false;
            document.getElementById("signupForm").reset();
            showMsg(succEl, "Account created! You can now sign in.", "success");
            setTimeout(() => {
                document.querySelector('.auth-tab[data-tab="signin"]')?.click();
                const emailEl = document.getElementById("email");
                if (emailEl) emailEl.value = email;
            }, 1400);
        } catch (err) {
            showMsg(errEl, "Could not create account. Please try again.", "error");
            console.error(err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<i class='ph ph-user-plus'></i> Create Account";
        }
    });
}

/* ════════════════════════════════════════════════════════
   MEMBER PAGE
   ════════════════════════════════════════════════════════ */
let _memberCatFilter = "all";


async function initMemberPage() {
    applyTheme();
    const user = ensureLogin("member");
    if (!user) return;

    async function updateChatLinkVisibility(user) {
        const chatLink = document.getElementById("activeChatLink");
        if (!chatLink) return;
        try {
            const { data: requests } = await supabaseClient
                .from('chat_requests')
                .select('status')
                .eq('user_email', user.email)
                .eq('status', 'approved');
            const messages = await dbGetMessages(user.email, "admin@umak.edu.ph");
            if ((requests && requests.length > 0) || (messages && messages.length > 0)) {
                chatLink.classList.remove("hidden");
            } else {
                chatLink.classList.add("hidden");
            }
        } catch (e) {
            console.error("Error checking chat visibility:", e);
        }
    }
    updateChatLinkVisibility(user);
    startRealtimeNotifications(user, false);

    const nameEl   = document.getElementById("memberName");
    const avatarEl = document.getElementById("memberAvatar");
    if (nameEl)   nameEl.textContent   = user.name;
    if (avatarEl) avatarEl.textContent = (user.name || "M").slice(0, 2).toUpperCase();
    document.getElementById("logoutBtn").onclick = logout;

    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            switchMemberSection(link.dataset.section);
        });
    });

    document.querySelectorAll("#catFilter .cat-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#catFilter .cat-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            _memberCatFilter = pill.dataset.cat;
            const otherWrap = document.getElementById("otherFilterWrap");
            if (_memberCatFilter === "Other") {
                otherWrap?.classList.remove("hidden");
                document.getElementById("otherFilterText")?.focus();
            } else {
                otherWrap?.classList.add("hidden");
            }
            filterMemberItems();
        });
    });

    await renderMemberSection(user);
}

async function switchMemberSection(section) {
    document.querySelectorAll(".nav-link[data-section]").forEach(l =>
        l.classList.toggle("active", l.dataset.section === section)
    );
    document.querySelectorAll(".admin-section").forEach(s =>
        s.classList.toggle("hidden", s.id !== `section-${section}`)
    );
    const user = getCurrentUser();
    if (!user) return;
    if (section === "items")         await renderAvailableItems(user);
    if (section === "requests")      await renderMyRequests(user);
    if (section === "conversations") await renderResolutions();
}

async function renderMemberSection(user) {
    const itemsEl    = document.getElementById("itemsList");
    const requestsEl = document.getElementById("myRequests");
    if (itemsEl)    itemsEl.innerHTML    = loadingState("Loading posts…");
    if (requestsEl) requestsEl.innerHTML = loadingState("Loading requests…");

    try {
        const [items, requests] = await Promise.all([
            dbGetItems(), dbGetRequests(user.email),
        ]);
        // Comments load separately — a missing table won't crash the feed
        const comments = await dbGetComments();
        _renderAvailableItems(items, comments, user);
        _renderMyRequests(requests);
        setTimeout(injectTTSButtons, 300);
    } catch (err) {
        console.error("Failed to load member data:", err);
        if (itemsEl) itemsEl.innerHTML = emptyState("Could not load posts. Please refresh.");
    }
}

async function renderAvailableItems(user) {
    const listEl = document.getElementById("itemsList");
    if (listEl) listEl.innerHTML = loadingState("Loading posts…");
    try {
        const items    = await dbGetItems();
        const comments = await dbGetComments();
        _renderAvailableItems(items, comments, user);
        setTimeout(injectTTSButtons, 200);
    } catch (err) {
        console.error(err);
        if (listEl) listEl.innerHTML = emptyState("Could not load posts.");
    }
}

function _renderAvailableItems(items, comments, user) {
    const approved = items.filter(i => i.status === "Approved");
    const countEl  = document.getElementById("itemsCountLabel");
    const listEl   = document.getElementById("itemsList");

    if (countEl) countEl.textContent = `${approved.length} post${approved.length !== 1 ? "s" : ""} available`;
    if (!listEl) return;

    listEl.innerHTML = approved.length
        ? approved.map(item => renderItemCard(item, generateCommentSection(item, comments))).join("")
        : emptyState("No posts yet. Use the + button to share something.");

    // Submit comment on button click
    listEl.querySelectorAll(".comment-submit-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const inputEl = document.getElementById(`comment-input-${btn.dataset.id}`);
            if (inputEl) await handleComment(btn.dataset.id, inputEl.value, user);
        });
    });

    // Submit comment on Enter key
    listEl.querySelectorAll(".comment-input").forEach(input => {
        const itemId = input.id.replace("comment-input-", "");
        input.addEventListener("keydown", async e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await handleComment(itemId, input.value, user);
            }
        });
    });

    filterMemberItems();
}

function _commentCountLabel(itemId, comments) {
    const n = (comments || []).filter(c => c.item_id === itemId).length;
    return `${n} comment${n !== 1 ? "s" : ""}`;
}

/* Renders a single comment row — handles admin badge + name/email display */
function _renderCommentItem(c) {
    const user = getCurrentUser(); //
    const isAdmin = user?.role === 'admin';
    
    // Logic: Show delete button if user is an Admin OR if the user is the author
    const isAuthor = user?.email === c.user_email;
    const canDelete = isAdmin || isAuthor;

    const deleteBtn = canDelete 
        ? `<button class="button danger sm" onclick="handleDeleteComment('${c.id}', '${c.item_id}')" 
                   style="padding:4px; background:transparent; border:none; color:var(--red); cursor:pointer;"
                   title="Delete Comment">
               <i class="ph ph-trash"></i>
           </button>` 
        : "";

    const isSystemAdmin = c.user_email === ADMIN_EMAIL || c.user_name === "System Admin";
    const authorHtml = isSystemAdmin
        ? `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:0.82rem;background:rgba(225,29,72,0.12);color:#e11d48;padding:2px 8px;border-radius:99px;border:1px solid rgba(225,29,72,0.3);"><i class="ph ph-shield-star"></i> Admin</span>`
        : `<span style="font-weight:600;font-size:0.82rem;color:var(--accent);">${esc(c.user_name)}</span>`;

    return `
        <div style="padding:9px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:6px;">
                    ${authorHtml}
                    <span style="font-size:0.73rem;color:var(--text-muted);">${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                ${deleteBtn}
            </div>
            <p style="margin:0;font-size:0.88rem;color:var(--text-secondary);line-height:1.45;">${esc(c.content)}</p>
        </div>`;
}

function generateCommentSection(item, comments) {
    const itemComments = (comments || []).filter(c => c.item_id === item.id);
    const count = itemComments.length;

    // Separate the most recent 3 from the rest
    const visibleComments = itemComments.slice(0, 3);
    const hiddenComments = itemComments.slice(3);

    const visibleHtml = visibleComments.length
        ? visibleComments.map(_renderCommentItem).join("")
        : `<p style="margin:0;font-size:0.83rem;color:var(--text-muted);text-align:center;padding:10px 0;">No comments yet — be the first!</p>`;

    const hiddenHtml = hiddenComments.length
        ? `<div id="extra-comments-${esc(item.id)}" class="hidden">${hiddenComments.map(_renderCommentItem).join("")}</div>`
        : "";

    // Show button only if there are more than 3 comments
    const viewMoreBtn = count > 3 
        ? `<button class="button outline sm" id="view-more-btn-${esc(item.id)}" 
                   onclick="toggleMoreComments('${esc(item.id)}')" 
                   style="width:100%; margin: 8px 0; border: none; background: rgba(255,255,255,0.05);">
             View ${count - 3} more comments...
           </button>` 
        : "";

    return `
    <div class="comment-section" style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
        <p style="margin:0 0 8px 0;font-size:0.78rem;font-weight:600;letter-spacing:0.06em;
                  text-transform:uppercase;color:var(--text-muted);">
            <i class="ph ph-chat-circle"></i> Comments
            <span id="comment-count-${esc(item.id)}" style="font-weight:400;margin-left:4px;">(${count})</span>
        </p>
        <div id="comment-list-${esc(item.id)}" style="margin-bottom:10px;max-height:400px;overflow-y:auto;padding-right:2px;">
            ${visibleHtml}
            ${hiddenHtml}
        </div>
        ${viewMoreBtn}
        <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" class="comment-input" id="comment-input-${esc(item.id)}"
                placeholder="Add a comment…" maxlength="300"
                style="flex:1;padding:8px 12px;border-radius:var(--radius-sm);
                       border:1px solid var(--border);background:var(--bg-raised);
                       color:var(--text-primary);font-size:0.88rem;outline:none;">
            <button class="button primary sm comment-submit-btn" data-id="${esc(item.id)}" type="button" title="Post comment">
                <i class="ph ph-paper-plane-tilt"></i>
            </button>
        </div>
    </div>`;
}

async function handleComment(itemId, content, user) {
    if (!content.trim()) { showToast("Comment cannot be empty.", "error"); return; }
    const submitBtn = document.querySelector(`.comment-submit-btn[data-id="${itemId}"]`);
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = `<i class="ph ph-circle-notch"></i>`; }
    try {
        await dbInsertComment({
            itemId,
            userEmail: user.email,
            userName:  user.name,
            content:   content.trim()
        });
        const freshComments = await dbGetComments(itemId);
        const listEl    = document.getElementById(`comment-list-${itemId}`);
        const countEl   = document.getElementById(`comment-count-${itemId}`);
        if (listEl) {
            listEl.innerHTML = freshComments.length
                ? freshComments.map(_renderCommentItem).join("")
                : "";
            listEl.scrollTop = listEl.scrollHeight;
        }
        if (countEl) countEl.textContent = `(${freshComments.length})`;
        const inputEl = document.getElementById(`comment-input-${itemId}`);
        if (inputEl) inputEl.value = "";
    } catch (err) {
        console.error("Comment failed:", err);
        showToast("Could not post comment. Please try again.", "error");
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = `<i class="ph ph-paper-plane-tilt"></i>`; }
    }
}

async function renderMyClaims(user) {
    const claimsEl = document.getElementById("myClaims");
    if (claimsEl) claimsEl.innerHTML = loadingState("Loading claims…");
    try {
        const claims = await dbGetClaims(user.email);
        _renderMyClaims(claims, user);
        setTimeout(injectTTSButtons, 200);
    } catch (err) {
        console.error(err);
        if (claimsEl) claimsEl.innerHTML = emptyState("Could not load claims.");
    }
}

function _renderMyClaims(claims, user) {
    const pending = claims.filter(c => c.status === "pending");
    const badge   = document.getElementById("claimsBadge");
    if (badge) { badge.textContent = pending.length; badge.classList.toggle("hidden", pending.length === 0); }
    const el = document.getElementById("myClaims");
    if (!el) return;
    el.innerHTML = claims.length
        ? claims.map(c => renderClaimCard(c)).join("")
        : emptyState("You haven't submitted any claim requests yet.");
}

async function renderMyRequests(user) {
    const reqEl = document.getElementById("myRequests");
    if (reqEl) reqEl.innerHTML = loadingState("Loading requests…");
    try {
        const requests = await dbGetRequests(user.email);
        _renderMyRequests(requests);
        setTimeout(injectTTSButtons, 200);
    } catch (err) {
        console.error(err);
        if (reqEl) reqEl.innerHTML = emptyState("Could not load requests.");
    }
}

function _renderMyRequests(requests) {
    const el = document.getElementById("myRequests");
    if (!el) return;
    el.innerHTML = requests.length
        ? requests.map(r => renderRequestCard(r)).join("")
        : emptyState("You haven't submitted any post requests yet. Tap the + button to get started.");
}

function filterMemberItems() {
    const searchEl  = document.getElementById("memberSearch");
    const q         = (searchEl?.value || "").toLowerCase();
    const cat       = _memberCatFilter;
    const otherText = (document.getElementById("otherFilterText")?.value || "").toLowerCase();

    const cards = document.querySelectorAll("#itemsList .item-card");
    let visible = 0;
    cards.forEach(card => {
        const cardType = (card.dataset.itemType || "").toLowerCase();
        const cardText = card.textContent.toLowerCase();
        const cardName = card.dataset.name || "";
        let catMatch   = true;
        if (cat !== "all") {
            if (cat === "Other") {
                const isOther = cardType === "other" || cardType === "";
                catMatch = isOther && (!otherText || cardText.includes(otherText));
            } else {
                catMatch = cardType === cat.toLowerCase();
            }
        }
        const textMatch = !q || cardText.includes(q) || cardName.includes(q);
        const show = catMatch && textMatch;
        card.style.display = show ? "" : "none";
        if (show) visible++;
    });
    const countEl = document.getElementById("itemsCountLabel");
    if (countEl) {
        countEl.textContent = q || cat !== "all"
            ? `${visible} item${visible !== 1 ? "s" : ""} shown`
            : `${cards.length} item${cards.length !== 1 ? "s" : ""} available`;
    }
}

/* ════════════════════════════════════════════════════════
   REQUEST FORM
   ════════════════════════════════════════════════════════ */
function selectType(type) {
    document.querySelectorAll(".type-choice").forEach(btn => btn.classList.remove("active-lost", "active-found"));
    const btn = type === "Lost" ? document.getElementById("typeLost") : document.getElementById("typeFound");
    if (btn) btn.classList.add(type === "Lost" ? "active-lost" : "active-found");
    const catEl = document.getElementById("category");
    if (catEl) catEl.value = type;
}

/* ══════════════════════════════════════════════════════════
   REQUEST FORM (SOCIAL POST)
   ══════════════════════════════════════════════════════════ */
function selectType(type) {
    document.querySelectorAll(".type-choice").forEach(btn => {
        btn.classList.remove("active-lost", "active-found", "active");
        btn.style.borderColor = "var(--border)";
        btn.style.background = "var(--bg-glass)";
    });
    const btn = document.getElementById("type" + type);
    if (btn) {
        btn.style.borderColor = "var(--accent)";
        btn.style.background = "rgba(255, 204, 0, 0.1)";
    }
    const catEl = document.getElementById("category");
    if (catEl) catEl.value = type;
}

function initRequestForm() {
    applyTheme();
    const user = ensureLogin("member");
    if (!user) return;

    // Default select
    selectType('Showcase');

    const form      = document.getElementById("requestForm");
    const msgEl     = document.getElementById("requestSuccess");
    const cancelBtn = document.querySelector(".form-actions a.button.secondary");

    let isFormDirty = false;
    form.addEventListener("input", () => isFormDirty = true);

    if (cancelBtn) {
        cancelBtn.addEventListener("click", e => {
            // Only show the modal if the user actually typed something
            if (isFormDirty) {
                e.preventDefault();
                showConfirm(
                    "Discard Post?", 
                    "You have unsaved details. Are you sure you want to leave?", 
                    "Discard", 
                    true, // This makes the button red (Danger)
                    () => {
                        isFormDirty = false; // Reset the flag
                        window.location.href = "adminpage.html";
                    }
                );
            }
        });
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();
        if (msgEl) { msgEl.textContent = ""; msgEl.className = ""; }

        const category    = document.getElementById("category").value;
        const itemName    = document.getElementById("itemName").value.trim();
        const description = document.getElementById("description").value.trim();
        const fileInput   = document.getElementById("itemImage");
        const file        = fileInput ? fileInput.files[0] : null;

        if (!itemName || !description) {
            showMsg(msgEl, "Please provide a title and content for your post.", "error"); return;
        }

        showConfirm("Submit Post", `Submit this post for admin review?`, "Submit", false, async () => {
            const submitBtn = form.querySelector("button[type=submit]");
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Uploading & Submitting…"; }
            try {
                let imageUrl = null;
                if (file) {
                    const fileExt  = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `${user.email}/${fileName}`;
                    const { error: uploadError } = await supabaseClient.storage.from('item-images').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = supabaseClient.storage.from('item-images').getPublicUrl(filePath);
                    imageUrl = publicUrlData.publicUrl;
                }
                
                // Save to requests table.
                await dbInsertRequest({
                    id: `req-${Date.now()}`,
                    name: itemName, category: category, itemType: "", description: description, location: "",
                    date: "", 
                    contact: user.name, // <--- NEW: Automatically saves the poster's name!
                    requestedBy: user.email, status: "pending",
                    image_url: imageUrl
                });
                logActivity("post_request", `${user.email} submitted a post: "${itemName}"`);
                showMsg(msgEl, "Post submitted! An admin will review it shortly.", "success");
                isFormDirty = false;
                form.reset();
            } catch (err) {
                showMsg(msgEl, "Could not submit post. Please try again.", "error");
                console.error(err);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Post to Feed"; }
            }
        });
    });
}

/* ════════════════════════════════════════════════════════
   ADMIN PAGE
   ════════════════════════════════════════════════════════ */
function initAdminPage() {
    applyTheme();
    const user = ensureLogin("admin");
    if (!user) return;
    document.getElementById("logoutBtn").onclick = logout;

    const avatar = document.getElementById("adminAvatarText");
    const name   = document.getElementById("adminNameText");
    if (avatar) avatar.textContent = (user.name || "SA").slice(0,2).toUpperCase();
    if (name)   name.textContent   = user.name || "System Admin";

    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        link.addEventListener("click", e => { e.preventDefault(); switchAdminSection(link.dataset.section); });
    });
    setupNotifBell();
    startRealtimeNotifications(user, true);
    renderAdminDashboard();
}

function switchAdminSection(section) {
    document.querySelectorAll(".nav-link[data-section]").forEach(l =>
        l.classList.toggle("active", l.dataset.section === section)
    );
    document.querySelectorAll(".admin-section").forEach(s =>
        s.classList.toggle("hidden", s.id !== `section-${section}`)
    );
    const renders = {
        "dashboard":    renderAdminDashboard,
        "manage-items": renderManageItems,
        "users":        renderUsersSection,
        "activity":     renderActivityLog,
        "conversations": renderResolutions
    };
    renders[section]?.();
}

async function renderAdminDashboard() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("statTotal","…"); set("statPendingReqs","…"); set("statChats","…"); set("statMembers","…");
    const pendingEl  = document.getElementById("pendingRequests");
    const approvedEl = document.getElementById("approvedItems");
    if (pendingEl)  pendingEl.innerHTML  = loadingState("Loading requests…");
    if (approvedEl) approvedEl.innerHTML = loadingState("Loading posts…");

    try {
        // Removed dbGetClaims()
        const [items, requests, users, chatReqs] = await Promise.all([
            dbGetItems(), dbGetRequests(), dbGetUsers(), dbGetChatRequests()
        ]);

        const pendingReq    = requests.filter(r => r.status === "pending");
        const pendingChats  = chatReqs.filter(cr => cr.status === "pending");
        const totalPending  = pendingReq.length + pendingChats.length;

        set("statTotal",         items.length);
        set("statPendingReqs",   pendingReq.length);
        set("statMembers",       users.length);
        set("statChats",         pendingChats.length);
        set("notificationCount", totalPending);

        if (pendingEl) {
            pendingEl.innerHTML = pendingReq.length
                ? pendingReq.map(req => renderRequestCard(req, `
                    <div class="request-actions">
                        <button class="button primary sm" data-action="approve" data-id="${req.id}"><i class="ph ph-check"></i> Approve</button>
                        <button class="button danger sm" data-action="reject" data-id="${req.id}"><i class="ph ph-x"></i> Reject</button>
                    </div>`)).join("")
                : emptyState("No pending posts right now.");
            pendingEl.querySelectorAll("button[data-action]").forEach(btn =>
                btn.addEventListener("click", () => processRequest(btn.dataset.id, btn.dataset.action, requests))
            );
        }
        if (approvedEl) {
            // Added: fetch comments first so they can be injected into the dashboard view
            const comments = await dbGetComments(); 
            
            approvedEl.innerHTML = items.length
                ? items.map(i => {
                    // Inject the comment section here just like in the Manage Posts tab
                    const commentHtml = generateCommentSection(i, comments);
                    return renderItemCard(i, commentHtml); 
                }).join("")
                : emptyState("No live posts yet.");

            // Re-bind the comment submit events for the dashboard view
            approvedEl.querySelectorAll(".comment-submit-btn").forEach(btn => {
                btn.onclick = () => {
                    const input = document.getElementById(`comment-input-${btn.dataset.id}`);
                    handleComment(btn.dataset.id, input.value, getCurrentUser());
                };
            });
        }

        const bell  = document.getElementById("notificationBell");
        const modal = document.getElementById("requestModal");
        if (bell && modal) {
            bell.onclick = () => openRequestModal(pendingReq, pendingChats, modal, requests);
            document.getElementById("closeModal").onclick = () => closeModal(modal);
            modal.querySelector(".modal-backdrop").onclick = () => closeModal(modal);
        }

        const searchEl = document.getElementById("adminSearch");
        if (searchEl) {
            searchEl.oninput = () => {
                const q = searchEl.value.toLowerCase();
                document.querySelectorAll("#section-dashboard .item-card").forEach(card => {
                    card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
                });
            };
        }
    } catch (err) {
        console.error("Dashboard load failed:", err);
        if (pendingEl)  pendingEl.innerHTML  = emptyState("Could not load data. Please refresh.");
        if (approvedEl) approvedEl.innerHTML = "";
    }
}

let _itemFilter  = "all";
let _isEditDirty = false;
let _cachedItems = [];

async function renderManageItems() {
    const countEl = document.getElementById("itemCountLabel");
    const listEl  = document.getElementById("allItemsList");
    if (listEl) listEl.innerHTML = loadingState("Loading items…");

    try {
        _cachedItems = await dbGetItems();
        setupManageItemsUI(_cachedItems, countEl, listEl);
    } catch (err) {
        console.error(err);
        if (listEl) listEl.innerHTML = emptyState("Could not load items.");
    }

    const editModal = document.getElementById("editModal");
    if (editModal) {
        const closeEditHandler = () => {
            if (_isEditDirty) {
                showConfirm("Discard Changes?", "You have unsaved edits. Are you sure?", "Discard", true, () => {
                    closeModal(editModal); _isEditDirty = false;
                });
            } else { closeModal(editModal); }
        };
        document.getElementById("closeEditModal").onclick  = closeEditHandler;
        document.getElementById("cancelEditModal").onclick = closeEditHandler;
        editModal.querySelector(".modal-backdrop").onclick = closeEditHandler;
        document.getElementById("editItemForm").onsubmit   = e => { e.preventDefault(); saveItemEdit(); };
    }
}

async function setupManageItemsUI(items, countEl, listEl) {
    // Fetch comments so admins can see and add to them
    const comments = await dbGetComments();
    const requests = await dbGetRequests(); // Fetch pending items

    function applyFilter() {
        const search = (document.getElementById("itemSearch")?.value || "").toLowerCase();
        
        // Combine live items and pending requests for the admin to see everything
        let combinedPool = [...items.map(i => ({...i, status: 'Approved'})), ...requests.filter(r => r.status === 'pending').map(r => ({...r, status: 'pending'}))];

        const filtered = combinedPool.filter(i => {
            const matchFilter = _itemFilter === "all" || i.category === _itemFilter || (_itemFilter === "pending" && i.status === "pending");
            const matchSearch = !search || i.name.toLowerCase().includes(search) || i.description?.toLowerCase().includes(search);
            return matchFilter && matchSearch;
        });

        if (countEl) countEl.textContent = `Showing ${filtered.length} items`;
        
        listEl.innerHTML = filtered.map(item => {
            let actions = "";
            if (item.status === "pending") {
                // Actions for items needing approval
                actions = `
                    <div class="request-actions">
                        <button class="button primary sm" onclick="processRequest('${item.id}', 'approve')"><i class="ph ph-check"></i> Approve</button>
                        <button class="button danger sm" onclick="processRequest('${item.id}', 'reject')"><i class="ph ph-x"></i> Reject</button>
                    </div>`;
            } else {
                // Actions for live items
                actions = `
                    <div class="request-actions">
                        <button class="button secondary sm" onclick="openEditModal('${item.id}')"><i class="ph ph-pencil"></i> Edit</button>
                        <button class="button danger sm" onclick="deleteItem('${item.id}')"><i class="ph ph-trash"></i> Delete</button>
                    </div>`;
            }
            
            // Add the full comment section (same as member page)
            const commentHtml = generateCommentSection(item, comments);
            return renderItemCard(item, commentHtml + actions);
        }).join("");

        // Re-bind comment events for the admin
        listEl.querySelectorAll(".comment-submit-btn").forEach(btn => {
            btn.onclick = () => {
                const input = document.getElementById(`comment-input-${btn.dataset.id}`);
                const adminUser = getCurrentUser();
                handleComment(btn.dataset.id, input.value, adminUser);
            };
        });
    }

    // Bind filters
    document.querySelectorAll("#itemFilter .filter-tab").forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll("#itemFilter .filter-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            _itemFilter = tab.dataset.filter;
            applyFilter();
        };
    });

    applyFilter();
}

function openEditModal(id) {
    _isEditDirty = false;
    const item = _cachedItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById("editItemId").value       = item.id;
    document.getElementById("editItemName").value     = item.name;
    document.getElementById("editItemCategory").value = item.category;
    document.getElementById("editItemDesc").value     = item.description;
    document.getElementById("editItemLocation").value = item.location;
    document.getElementById("editItemStatus").value   = item.status;
    document.getElementById("editItemContact").value  = item.contact;
    document.getElementById("editItemForm").oninput   = () => _isEditDirty = true;
    const m = document.getElementById("editModal");
    m.classList.remove("hidden"); m.setAttribute("aria-hidden", "false");
}

async function saveItemEdit() {
    showConfirm("Save Changes", "Apply these updates to the item?", "Save", false, async () => {
        const id = document.getElementById("editItemId").value;
        const fields = {
            name:        document.getElementById("editItemName").value.trim(),
            category:    document.getElementById("editItemCategory").value,
            description: document.getElementById("editItemDesc").value.trim(),
            location:    document.getElementById("editItemLocation").value.trim(),
            status:      document.getElementById("editItemStatus").value,
            contact:     document.getElementById("editItemContact").value.trim(),
        };
        try {
            await dbUpdateItem(id, fields);
            const prev = _cachedItems.find(i => i.id === id);
            logActivity("item_edited", `"${prev?.name || id}" was edited`);
            _isEditDirty = false;
            closeModal(document.getElementById("editModal"));
            await renderManageItems();
        } catch (err) {
            console.error("Save failed:", err);
            showToast("Could not save changes. Please try again.", "error");
        }
    });
}

async function deleteItem(id) {
    const item = _cachedItems.find(i => i.id === id);
    if (!item) return;
    showConfirm("Delete Item", `Permanently delete "${item.name}"? This cannot be undone.`, "Delete", true, async () => {
        try {
            await dbDeleteItem(id);
            logActivity("item_deleted", `"${item.name}" was deleted`);
            await renderManageItems();
        } catch (err) {
            console.error("Delete failed:", err);
            showToast("Could not delete item. Please try again.", "error");
        }
    });
}

let _claimsFilter = "all";

async function renderClaimsSection() {
    const countEl = document.getElementById("claimsCountLabel");
    const listEl  = document.getElementById("allClaimsList");
    if (listEl) listEl.innerHTML = loadingState("Loading claims…");

    try {
        const claims = await dbGetClaims();
        function applyFilter() {
            const filtered = _claimsFilter === "all" ? claims : claims.filter(c => c.status === _claimsFilter);
            if (countEl) countEl.textContent = `Showing ${filtered.length} claim${filtered.length !== 1 ? "s" : ""}`;
            if (!listEl) return;
            listEl.innerHTML = filtered.length
                ? filtered.map(c => {
                    const actions = c.status === "pending" ? `
                        <div class="request-actions">
                            <button class="button primary sm" data-action="approve-claim" data-id="${c.id}"><i class="ph ph-check"></i> Approve</button>
                            <button class="button danger sm" data-action="reject-claim" data-id="${c.id}"><i class="ph ph-x"></i> Reject</button>
                        </div>` : "";
                    return renderClaimCard(c, actions);
                }).join("")
                : emptyState("No claims in this category.");
            listEl.querySelectorAll("button[data-action]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const action = btn.dataset.action === "approve-claim" ? "approve" : "reject";
                    processClaim(btn.dataset.id, action, claims, true);
                });
            });
            setTimeout(injectTTSButtons, 200);
        }
        document.querySelectorAll("#claimsFilter .filter-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll("#claimsFilter .filter-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                _claimsFilter = tab.dataset.filter;
                applyFilter();
            });
        });
        applyFilter();
    } catch (err) {
        console.error(err);
        if (listEl) listEl.innerHTML = emptyState("Could not load claims.");
    }
}

async function renderUsersSection() {
    const countEl  = document.getElementById("usersCountLabel");
    const listEl   = document.getElementById("usersList");
    const searchEl = document.getElementById("userSearch");
    if (listEl) listEl.innerHTML = loadingState("Loading members…");

    try {
        const currentUser = getCurrentUser();
        // Identify if the person logged in is the original Master Admin
        const isMasterAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        const [users, requests, claims] = await Promise.all([dbGetUsers(), dbGetRequests(), dbGetClaims()]);

        function applyFilter() {
            const q        = (searchEl?.value || "").toLowerCase();
            const filtered = q ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
            if (countEl) countEl.textContent = `${filtered.length} member${filtered.length !== 1 ? "s" : ""} registered`;
            if (!listEl) return;
            if (!filtered.length) { listEl.innerHTML = emptyState("No members found."); return; }
            
            listEl.innerHTML = filtered.map(u => {
                const reqCount   = requests.filter(r => r.requestedBy === u.email).length;
                const claimCount = claims.filter(c => c.requestedBy === u.email).length;
                const joinDate   = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "Unknown";
                
                const isTargetAdmin = u.role === "admin" || u.role === "Admin";
                const isTargetMaster = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                
                const roleBadge  = isTargetAdmin
                    ? `<span class="admin-badge"><i class="ph ph-shield-star"></i> Admin</span>`
                    : `<span class="tag tag-approved">● Member</span>`;
                
                let roleBtn = "";
                let removeBtn = `<button class="button danger sm remove-user-btn" data-email="${esc(u.email)}" data-name="${esc(u.name)}"><i class="ph ph-trash"></i> Remove</button>`;

                // ── SECURITY LOGIC ──
                if (isMasterAdmin) {
                    if (isTargetMaster) {
                        roleBtn = `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: bold;">MASTER ADMIN</span>`;
                        removeBtn = ""; // Master cannot be removed
                    } else {
                        roleBtn = isTargetAdmin
                            ? `<button class="button secondary sm revoke-admin-btn" data-email="${esc(u.email)}" data-name="${esc(u.name)}"><i class="ph ph-shield-slash"></i> Revoke Admin</button>`
                            : `<button class="button outline sm grant-admin-btn" data-email="${esc(u.email)}" data-name="${esc(u.name)}"><i class="ph ph-shield-star"></i> Grant Admin</button>`;
                    }
                } else {
                    // Sub-admin viewing the list
                    if (isTargetMaster) {
                        removeBtn = ""; // Sub-admins cannot remove the master admin
                    }
                    if (isTargetAdmin && u.email !== currentUser.email) {
                        removeBtn = ""; // Sub-admins cannot remove other admins
                    }
                }

                return `
                <article class="card item-card">
                    <div class="item-header">
                        <div style="display:flex;align-items:center;gap:11px;">
                            <div class="profile-avatar" style="width:42px;height:42px;font-size:0.9rem;">${esc(u.name.slice(0,2).toUpperCase())}</div>
                            <div>
                                <h3 style="margin-bottom:2px;">${esc(u.name)}</h3>
                                <p style="margin:0;font-size:0.79rem;color:var(--text-secondary);">${esc(u.email)}</p>
                            </div>
                        </div>
                        ${roleBadge}
                    </div>
                    <dl style="margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                        <div class="user-stat"><dt>Joined</dt><dd style="font-size:0.9rem;">${joinDate}</dd></div>
                        <div class="user-stat"><dt>Requests</dt><dd>${reqCount}</dd></div>
                        <div class="user-stat"><dt>Claims</dt><dd>${claimCount}</dd></div>
                    </dl>
                    <div class="request-actions">
                        ${roleBtn}
                        ${removeBtn}
                    </div>
                </article>`;
            }).join("");

            // Re-bind listeners
            listEl.querySelectorAll(".grant-admin-btn").forEach(btn =>
                btn.addEventListener("click", () => {
                    showConfirm("Grant Admin Powers", `Give admin privileges to ${btn.dataset.name}?`, "Grant Admin", false, async () => {
                        try {
                            await dbUpdateUserRole(btn.dataset.email, "admin");
                            logActivity("admin_granted", `Admin powers granted to ${btn.dataset.name} (${btn.dataset.email})`);
                            addNotification(`Admin powers granted to ${btn.dataset.name}.`, 'info');
                            showToast(`${btn.dataset.name} is now an admin!`);
                            await renderUsersSection();
                        } catch (err) { console.error(err); showToast("Error updating role.", "error"); }
                    });
                })
            );
            listEl.querySelectorAll(".revoke-admin-btn").forEach(btn =>
                btn.addEventListener("click", () => {
                    showConfirm("Revoke Admin Powers", `Remove admin privileges from ${btn.dataset.name}?`, "Revoke", true, async () => {
                        try {
                            await dbUpdateUserRole(btn.dataset.email, "member");
                            logActivity("admin_revoked", `Admin powers revoked from ${btn.dataset.name} (${btn.dataset.email})`);
                            showToast(`${btn.dataset.name}'s admin role has been revoked.`);
                            await renderUsersSection();
                        } catch (err) { console.error(err); showToast("Error updating role.", "error"); }
                    });
                })
            );
            listEl.querySelectorAll(".remove-user-btn").forEach(btn =>
                btn.addEventListener("click", () => {
                    showConfirm("Remove Member", `Permanently remove ${btn.dataset.name}?`, "Remove", true, async () => {
                        try {
                            await dbDeleteUser(btn.dataset.email);
                            await renderUsersSection();
                        } catch (err) { console.error(err); showToast("Error removing user.", "error"); }
                    });
                })
            );
        }
        if (searchEl) searchEl.oninput = applyFilter;
        applyFilter();
    } catch (err) {
        console.error(err);
        if (listEl) listEl.innerHTML = emptyState("Could not load users.");
    }
}

async function renderActivityLog() {
    const countEl = document.getElementById("activityCountLabel");
    const listEl  = document.getElementById("activityList");
    if (countEl) countEl.textContent = "Loading...";
    if (!listEl) return;
    
    try {
        const { data: log, error } = await supabaseClient
            .from('activity_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        
        if (countEl) countEl.textContent = `${log.length} event${log.length !== 1 ? "s" : ""} recorded`;
        if (!log.length) { listEl.innerHTML = emptyState("No activity recorded yet."); return; }
        
        listEl.innerHTML = log.map(entry => {
            const icon  = ACTIVITY_ICONS[entry.type] || "◎";
            const time  = new Date(entry.timestamp).toLocaleString();
            const label = entry.type.replace(/_/g, " ");
            return `
            <div class="activity-entry">
                <div class="activity-icon">${icon}</div>
                <div>
                    <p class="activity-detail">${esc(entry.detail)}</p>
                    <p class="activity-meta"><span class="activity-type">${esc(label)}</span> · ${esc(time)}</p>
                </div>
            </div>`;
        }).join("");
    } catch (err) {
        console.error(err);
        listEl.innerHTML = emptyState("Failed to load activity log from database.");
    }

    const clearBtn = document.getElementById("clearActivityBtn");
    if (clearBtn) {
        clearBtn.onclick = () => {
            showConfirm("Clear Log", "Are you sure you want to clear the entire activity log?", "Clear All", true, async () => {
                try {
                    // Deletes everything in the log table
                    await supabaseClient.from('activity_log').delete().neq('id', '0'); 
                    await logActivity("activity_cleared", "Activity log cleared by admin");
                    renderActivityLog();
                } catch (err) {
                    console.error("Clear failed", err);
                }
            });
        };
    }
}

function openRequestModal(pendingReq, pendingChats, modal, allRequests) {
    modal.classList.remove("hidden"); modal.setAttribute("aria-hidden", "false");
    const postEl  = document.getElementById("modalPostRequests");
    const chatEl  = document.getElementById("modalChatRequests");

    if (postEl) postEl.innerHTML = pendingReq.length
        ? pendingReq.map(req => renderRequestCard(req, `
            <div class="request-actions">
                <button class="button primary sm" data-action="approve" data-id="${req.id}"><i class="ph ph-check"></i> Approve</button>
                <button class="button danger sm" data-action="reject" data-id="${req.id}"><i class="ph ph-x"></i> Reject</button>
            </div>`)).join("")
        : emptyState("No pending post requests.");

    if (chatEl) chatEl.innerHTML = pendingChats.length
        ? pendingChats.map(chat => `
            <article class="card item-card">
                <div class="item-header"><span class="tag tag-pending"><i class="ph ph-chat-circle"></i> Chat Request</span></div>
                <h3 style="margin-top:8px;">${esc(chat.user_name)}</h3>
                <p><strong>Reason:</strong> ${esc(chat.reason)}</p>
                <p style="font-size:0.8rem;color:var(--text-secondary);">${esc(chat.user_email)}</p>
                <div class="request-actions">
                    <button class="button primary sm" data-action="approve-chat" data-id="${chat.id}" data-email="${esc(chat.user_email)}" data-name="${esc(chat.user_name)}">
                        <i class="ph ph-chat-text"></i> Accept &amp; Chat
                    </button>
                    <button class="button danger sm" data-action="reject-chat" data-id="${chat.id}"><i class="ph ph-x"></i> Reject</button>
                </div>
            </article>`).join("")
        : emptyState("No pending chat requests.");

    modal.querySelectorAll("button[data-action]").forEach(btn => {
        const { action, id, email, name } = btn.dataset;
        btn.onclick = () => {
            if (action === "approve")  processRequest(id, "approve", allRequests);
            if (action === "reject")   processRequest(id, "reject",  allRequests);
            if (action === "approve-chat")  processChatRequest(id, "approve", email, name);
            if (action === "reject-chat")   processChatRequest(id, "reject", email, name);
        };
    });
}

function closeModal(modal) {
    if (document.activeElement) document.activeElement.blur();
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

async function processChatRequest(id, action, email, name) {
    const isApprove = action === "approve";
    showConfirm(`${isApprove?"Accept":"Reject"} Chat Request`, `Are you sure?`, isApprove?"Accept":"Reject", !isApprove, async () => {
        try {
            await dbUpdateChatRequestStatus(id, isApprove ? "approved" : "rejected");
            closeModal(document.getElementById("requestModal"));
            if (isApprove) {
                window.location.href = `messageft.html?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
            } else {
                await renderAdminDashboard();
            }
        } catch (err) {
            console.error(err);
            showToast("Error processing chat request.", "error");
        }
    });
}

async function processRequest(id, action, cachedRequests = null) {
    const isApprove = action === "approve";
    const actionTxt = isApprove ? "Approve" : "Reject";
    showConfirm(`${actionTxt} Request`, `Are you sure you want to ${actionTxt.toLowerCase()} this post request?`, actionTxt, !isApprove, async () => {
        try {
            const requests = cachedRequests || await dbGetRequests();
            const req = requests.find(r => r.id === id);
            if (!req) return;
            if (isApprove) {
                await dbInsertItem({
                    id: `item-${Date.now()}`,
                    name: req.name, category: req.category, itemType: req.itemType,
                    description: req.description, location: req.location,
                    date: req.date, contact: req.contact,
                    imageUrl: req.imageUrl
                });
                logActivity("post_approved", `"${req.name}" by ${req.requestedBy} was approved`);
                addNotification(`Post request for "${req.name}" approved.`, 'info');
            } else {
                logActivity("post_rejected", `"${req.name}" by ${req.requestedBy} was rejected`);
                addNotification(`Post request for "${req.name}" rejected.`, 'info');
            }
            await dbUpdateRequestStatus(id, isApprove ? "approved" : "rejected");
            closeModal(document.getElementById("requestModal"));
            await renderAdminDashboard();
        } catch (err) {
            console.error("processRequest failed:", err);
            showToast("Could not process request. Please try again.", "error");
        }
    });
}

async function processClaim(id, action, cachedClaims = null, fromClaimsSection = false) {
    const isApprove = action === "approve";
    const actionTxt = isApprove ? "Approve" : "Reject";
    showConfirm(`${actionTxt} Claim`, `Are you sure you want to ${actionTxt.toLowerCase()} this claim request?`, actionTxt, !isApprove, async () => {
        try {
            const claims = cachedClaims || await dbGetClaims();
            const claim  = claims.find(c => c.id === id);
            if (!claim) return;
            await dbUpdateClaimStatus(id, isApprove ? "approved" : "rejected");
            if (isApprove) {
                await dbUpdateItem(claim.itemId, { status: "Claimed" });
                logActivity("claim_approved", `Claim on "${claim.name}" by ${claim.requestedBy} approved`);
                addNotification(`Claim on "${claim.name}" has been approved.`, 'info');
            } else {
                logActivity("claim_rejected", `Claim on "${claim.name}" by ${claim.requestedBy} rejected`);
                addNotification(`Claim on "${claim.name}" has been rejected.`, 'info');
            }
            if (fromClaimsSection) await renderClaimsSection();
            else { closeModal(document.getElementById("requestModal")); await renderAdminDashboard(); }
        } catch (err) {
            console.error("processClaim failed:", err);
            showToast("Could not process claim. Please try again.", "error");
        }
    });
}

/* ════════════════════════════════════════════════════════
   ADMIN REQUEST FORM
   ════════════════════════════════════════════════════════ */
function initAdminRequestForm() {
    applyTheme();
    const user = ensureLogin("admin");
    if (!user) return;

    const params  = new URLSearchParams(window.location.search);
    const urlType = params.get("type");
    if (urlType === "Lost" || urlType === "Found") selectType(urlType);

    document.querySelectorAll(".type-choice").forEach(btn => btn.addEventListener("click", () => selectType(btn.dataset.type)));

    document.querySelectorAll(".type-tile").forEach(tile => {
        tile.addEventListener("click", () => {
            document.querySelectorAll(".type-tile").forEach(t => t.classList.remove("active"));
            tile.classList.add("active");
            const tileType = tile.dataset.type;
            if (document.getElementById("itemType")) document.getElementById("itemType").value = tileType;
            const otherWrap = document.getElementById("otherTypeWrap");
            if (tileType === "Other") { otherWrap?.classList.remove("hidden"); document.getElementById("otherTypeText")?.focus(); }
            else { otherWrap?.classList.add("hidden"); }
        });
    });

    const form      = document.getElementById("requestForm");
    const msgEl     = document.getElementById("requestSuccess");
    const cancelBtn = document.querySelector(".form-actions a.button.secondary");

    let isFormDirty = false;
    form.addEventListener("input", () => isFormDirty = true);

    if (cancelBtn) {
        cancelBtn.addEventListener("click", e => {
            // Only show the modal if the user actually typed something
            if (isFormDirty) {
                e.preventDefault();
                showConfirm(
                    "Discard Post?", 
                    "You have unsaved details. Are you sure you want to leave?", 
                    "Discard", 
                    true, // This makes the button red (Danger)
                    () => {
                        isFormDirty = false; // Reset the flag
                        window.location.href = "adminpage.html";
                    }
                );
            }
        });
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();
        if (msgEl) { msgEl.textContent = ""; msgEl.className = ""; }

        // ONLY grab fields that actually exist in your new HTML
        const category    = document.getElementById("category").value;
        const itemName    = document.getElementById("itemName").value.trim();
        const description = document.getElementById("description").value.trim();
        const fileInput   = document.getElementById("itemImage");
        const file        = fileInput ? fileInput.files[0] : null;

        if (!itemName || !description) {
            showMsg(msgEl, "Please complete the title and content fields.", "error"); 
            return;
        }

        showConfirm("Post Directly", `Publish this to the feed immediately?`, "Post", false, async () => {
            const submitBtn = form.querySelector("button[type=submit]");
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "Publishing..."; }
            
            try {
                let imageUrl = null;
                if (file) {
                    const fileExt  = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `${user.email}/${fileName}`;
                    await supabaseClient.storage.from('item-images').upload(filePath, file);
                    const { data: publicUrlData } = supabaseClient.storage.from('item-images').getPublicUrl(filePath);
                    imageUrl = publicUrlData.publicUrl;
                }

                // Save DIRECTLY to items table (Bypassing requests)
                await dbInsertItem({
                    id: `item-${Date.now()}`,
                    name: itemName, 
                    category: category, 
                    itemType: "Admin Post",
                    description: description, 
                    location: "UMak Campus", 
                    date: new Date().toLocaleDateString(), 
                    contact: user.name, // <--- NEW: Replaced ADMIN_EMAIL with user.name
                    imageUrl: imageUrl 
                });

                showToast("Admin post is now live!");
                form.reset();
                window.location.href = "adminpage.html";
                
            } catch (err) {
                showMsg(msgEl, "Error: " + err.message, "error");
                console.error(err);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = "Publish Directly"; }
            }
        });
    });
}

/* ════════════════════════════════════════════════════════
   MOBILE MENU
   ════════════════════════════════════════════════════════ */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const appSidebar    = document.getElementById("appSidebar");
    const menuIcon      = document.getElementById("menuIcon");
    if (!mobileMenuBtn || !appSidebar) return;
    
    mobileMenuBtn.addEventListener("click", () => {
        appSidebar.classList.toggle("open");
        if (menuIcon) menuIcon.className = appSidebar.classList.contains("open") ? "ph ph-x" : "ph ph-list";
        
        // NEW: Clear the notification dot when they open the menu!
        const dot = document.getElementById("mobileMenuDot");
        if (dot) dot.remove();
    });
    
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            appSidebar.classList.remove("open");
            if (menuIcon) menuIcon.className = "ph ph-list";
        });
    });
    
    document.addEventListener("click", e => {
        if (appSidebar.classList.contains("open") &&
            !appSidebar.contains(e.target) &&
            !mobileMenuBtn.contains(e.target)) {
            appSidebar.classList.remove("open");
            if (menuIcon) menuIcon.className = "ph ph-list";
        }
    });
}

/* ════════════════════════════════════════════════════════
   ROUTER
   ════════════════════════════════════════════════════════ */
function initPage() {
    setupThemeToggle();
    const page = document.body.dataset.page;
    if (page === "login")        initLogin();
    if (page === "member")       initMemberPage();
    if (page === "admin")        initAdminPage();
    if (page === "request")      initRequestForm();
    if (page === "adminrequest") initAdminRequestForm();
    initMobileMenu();
}
window.addEventListener("DOMContentLoaded", initPage);

/* ════════════════════════════════════════════════════════
   CHAT & RESOLUTION
   ════════════════════════════════════════════════════════ */
function openChatRequestModal() {
    const m = document.getElementById('chatRequestModal');
    if(m) { m.classList.remove('hidden'); m.setAttribute('aria-hidden', 'false'); }
}

const chatReqForm = document.getElementById('chatRequestForm');
if(chatReqForm) {
    chatReqForm.onsubmit = async (e) => {
        e.preventDefault();
        const user   = getCurrentUser();
        const reason = document.getElementById('chatReason').value;
        await supabaseClient.from('chat_requests').insert([{
            user_email: user.email, user_name: user.name, reason: reason
        }]);
        showToast("Chat request sent to admin!");
        closeModal(document.getElementById('chatRequestModal'));
    };
}

async function populateAdminChatUserList() {
    const list = document.getElementById('userChatList');
    if(!list) return;
    
    // Fetch users who aren't the current admin
    const { data: users } = await supabaseClient.from('users').select('*').neq('role', 'admin');
    
    if (!users || users.length === 0) {
        list.innerHTML = emptyState("No members found to message.");
        return;
    }

    list.innerHTML = users.map(u => `
        <div class="card item-card">
            <div class="user-info-meta">
                <p style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                    ${esc(u.name)}
                </p>
                <p style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-mono);">
                    ${esc(u.email)}
                </p>
            </div>
            <a href="messageft.html?email=${encodeURIComponent(u.email)}&name=${encodeURIComponent(u.name)}" 
               class="button primary sm" 
               style="border-radius: var(--radius-sm); padding: 6px 12px;">
                <i class="ph ph-chat-dots"></i> Chat
            </a>
        </div>
    `).join("");
}

const userSelectModal = document.getElementById('userSelectModal');
if(userSelectModal) {
    const observer = new MutationObserver(() => {
        if (!userSelectModal.classList.contains('hidden')) populateAdminChatUserList();
    });
    observer.observe(userSelectModal, { attributes: true, attributeFilter: ['class'] });
}

async function renderResolutions() {
    const listEl = document.getElementById("resolutionsList");
    if (!listEl) return;
    listEl.innerHTML = loadingState("Loading archived chats...");
    
    const user = getCurrentUser();
    // NEW: We define isAdmin right here so the rest of the function can use it
    const isAdmin = user && user.role === "admin"; 
    
    let query = supabaseClient.from("resolutions").select("*").order("created_at", { ascending: false });
    
    // Use our new variable to filter the database query securely
    if (!isAdmin) {
        query = query.eq("user_email", user.email);
    }
    
    const { data, error } = await query;
    if (error) { 
        console.error(error);
        listEl.innerHTML = emptyState("Error loading logs."); 
        return; 
    }
    
    listEl.innerHTML = data.length ? data.map(r => {
        let chatLogHtml = "";
        // Check if chat_history exists and has items
        if (r.chat_history && Array.isArray(r.chat_history) && r.chat_history.length > 0) {
            const msgs = r.chat_history.map(msg => {
                const isFromAdmin = msg.sender_email.includes("admin");
                return `
                    <div style="margin-bottom: 6px; font-size: 0.82rem; line-height: 1.4;">
                        <strong style="color: ${isFromAdmin ? 'var(--accent)' : 'var(--text-primary)'}">${isFromAdmin ? 'Admin' : 'Member'}:</strong>
                        <span style="color: var(--text-secondary)">${esc(msg.content)}</span>
                    </div>`;
            }).join("");

            chatLogHtml = `
                <details style="margin-top: 14px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px;">
                    <summary style="cursor: pointer; font-size: 0.82rem; font-weight: 600; color: var(--text-primary); outline: none; user-select: none;">
                        <i class="ph ph-chat-text"></i> View Chat Transcript
                    </summary>
                    <div style="margin-top: 10px; max-height: 150px; overflow-y: auto; padding-top: 8px; border-top: 1px solid var(--border);">
                        ${msgs}
                    </div>
                </details>
            `;
        }

        return `
        <article class="card item-card">
            <div class="item-header">
                <span class="tag tag-approved"><i class="ph ph-archive"></i> ${esc(r.action_type || "Chat Archived")}</span>
                <span style="font-size:0.8rem;color:var(--text-secondary);">${esc(r.meeting_date)} at ${esc(r.meeting_time)}</span>
            </div>
            <div style="padding: 0 20px;">
                <h3 style="margin: 10px 0;">Chat Summary: ${isAdmin ? esc(r.user_email) : 'With Admin'}</h3>
                <p style="font-size: 0.88rem; color: var(--text-primary); background: var(--bg-raised); 
                        padding: 16px; border-radius: 12px; border-left: 4px solid var(--accent); 
                        margin-bottom: 16px; line-height: 1.5;">
                    <strong style="display:block; margin-bottom:4px; font-size:0.75rem; text-transform:uppercase; color:var(--accent);">Conclusion</strong>
                    ${esc(r.conclusion || "No conclusion provided.")}
                </p>
            </div>
            ${chatLogHtml}
        </article>
        `;
    }).join("") : emptyState("No archived conversations yet.");
}

/* ══════════════════════════════════════════════════════════
   GLOBAL REALTIME NOTIFICATIONS
   ══════════════════════════════════════════════════════════ */
function startRealtimeNotifications(user, isAdmin) {
    if (isAdmin) {
        // ADMIN: Listen for brand new requests submitted by members
        supabaseClient.channel('admin-global-notifs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, payload => {
                showToast(`New item requested: ${payload.new.name}`, "info");
                
                // If the admin is currently on the dashboard, refresh the lists automatically
                if (typeof renderAdminDashboard === "function") {
                    renderAdminDashboard();
                }
            })
            .subscribe();
    } else {
        // Helper to show/hide the Active Chat sidebar link without a full page reload
    function refreshChatLink() {
        const chatLink = document.getElementById("activeChatLink");
        if (!chatLink) return;
        
        // 1. Check if the link was ALREADY hidden before checking the DB
        const wasHidden = chatLink.classList.contains("hidden");

        Promise.all([
            supabaseClient.from('chat_requests').select('status').eq('user_email', user.email).eq('status', 'approved'),
            dbGetMessages(user.email, "admin@umak.edu.ph")
        ]).then(([{ data: reqs }, msgs]) => {
            const visible = (reqs && reqs.length > 0) || (msgs && msgs.length > 0);
            chatLink.classList.toggle("hidden", !visible);
            
            // 2. Only show the toast & dot if the chat JUST became visible
            if (visible && wasHidden) { 
                showToast("💬 Admin opened a chat — check Active Chat!", "info");
                
                // 3. Mobile UX: Add a red dot to the hamburger menu so they know to open it
                const mobileBtn = document.getElementById("mobileMenuBtn");
                if (mobileBtn && window.innerWidth <= 1100) {
                    let dot = document.getElementById("mobileMenuDot");
                    if (!dot) {
                        dot = document.createElement("div");
                        dot.id = "mobileMenuDot";
                        dot.style.cssText = "position:absolute; top:-2px; right:-2px; width:12px; height:12px; background:var(--red); border-radius:50%; border:2px solid var(--bg-surface);";
                        mobileBtn.style.position = "relative";
                        mobileBtn.appendChild(dot);
                    }
                }
            }
        }).catch(console.error);
    }

        supabaseClient.channel('member-global-notifs')
            // 1. Item post request approved / rejected
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, payload => {
                if (payload.new.requested_by === user.email && payload.new.status !== 'pending') {
                    const isApproved = payload.new.status === 'approve' || payload.new.status === 'Approved';
                    const actionWord = isApproved ? 'APPROVED' : 'REJECTED';
                    showToast(`Your request for "${payload.new.name}" was ${actionWord}!`, isApproved ? "success" : "error");
                    if (typeof renderMyRequests === "function") {
                        dbGetRequests(user.email).then(reqs => _renderMyRequests(reqs)).catch(console.error);
                    }
                }
            })
            // 2. Admin approves chat request → show Active Chat link instantly
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_requests' }, payload => {
                if (payload.new.user_email === user.email && payload.new.status === 'approved') {
                    refreshChatLink();
                }
            })
            // 3. Admin sends first message directly (no prior approval) → show Active Chat link instantly
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (payload.new.receiver_email === user.email) {
                    refreshChatLink();
                }
            })
            .subscribe();
    }
}

function toggleMoreComments(itemId) {
    const extraDiv = document.getElementById(`extra-comments-${itemId}`);
    const btn = document.getElementById(`view-more-btn-${itemId}`);
    
    if (extraDiv && btn) {
        extraDiv.classList.toggle('hidden');
        const isHidden = extraDiv.classList.contains('hidden');
        btn.textContent = isHidden ? `View more comments...` : `Show less`;
        
        // If showing more, scroll the list a bit to ensure they see the new ones
        if (!isHidden) {
            extraDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

async function handleDeleteComment(commentId, itemId) {
    const user = getCurrentUser(); //
    if (!user) return; //

    showConfirm("Delete Comment", "Are you sure? This action cannot be undone.", "Delete", true, async () => {
        try {
            await dbDeleteComment(commentId); //
            showToast("Comment removed."); //
            
            // 1. Fetch fresh comments for THIS item only
            const freshComments = await dbGetComments(itemId); //
            
            // 2. Find the post item in our cached items to get its full data
            const item = _cachedItems.find(i => i.id === itemId) || { id: itemId };

            // 3. TARGET THE WRAPPER: Find the specific comment section for this post
            const commentSectionWrapper = document.querySelector(`#comment-list-${itemId}`).parentElement;
            
            if (commentSectionWrapper) {
                // 4. RE-GENERATE: Use the full logic that handles "View More" and "Recent 3"
                commentSectionWrapper.outerHTML = generateCommentSection(item, freshComments);
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to delete comment.", "error");
        }
    });
}