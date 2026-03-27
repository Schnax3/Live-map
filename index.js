import { initializeApp }                        from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// Firebase Config
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBjd4IyQkhKsgvXmlvJ5P8nn4SS8Et6MAw",
    authDomain:        "maptracker-96fdb.firebaseapp.com",
      databaseURL:       "https://maptracker-96fdb-default-rtdb.europe-west1.firebasedatabase.app",
        projectId:         "maptracker-96fdb",
          storageBucket:     "maptracker-96fdb.firebasestorage.app",
            messagingSenderId: "81955613486",
              appId:             "1:81955613486:web:3a7fe4c013c12ac0d6a8bf"
              };

// Konfiguration
              const CONFIG = {
                updateIntervalMs: 5000,       // Firebase-Update max. alle 5 Sekunden
                  inactiveAfterMs:  30000,      // Nutzer nach 30s als inaktiv markieren
                    geo: {
                        enableHighAccuracy: true,
                            maximumAge:         3000,
                                timeout:            10000
                                  },
                                    colors: [
                                        "#00e5a0", "#ff4d6d", "#4d8eff", "#ffb340",
                                            "#c084fc", "#34d399", "#fb923c", "#60a5fa"
                                              ]
                                              };

                                              const GAME = {
                                                targetUpdateMs: 10 * 60 * 1000,
                                                  targetFastMs:   30 * 1000,
                                                    skipLimit:     3,
                                                      powerups: [
                                                          { id: "pulse",   name: "Pulse",  desc: "Ziel sofort + 2 Min lang alle 30s aktualisiert.", durationMs: 2 * 60 * 1000,  cooldownMs: 12 * 60 * 1000, effect: "reveal" },
                                                              { id: "tracker", name: "Tracker Boost", desc: "5 Min lang Ziel alle 30s aktualisiert.",   durationMs: 5 * 60 * 1000,  cooldownMs: 25 * 60 * 1000, effect: "fast" },
                                                                  { id: "overclock", name: "Overclock", desc: "90s lang Ziel alle 10s aktualisiert.",      durationMs: 90 * 1000,      cooldownMs: 20 * 60 * 1000, effect: "ultra" },
                                                                      { id: "cloak",  name: "Cloak",  desc: "15 Min unsichtbar für andere Spieler.",       durationMs: 15 * 60 * 1000, cooldownMs: 35 * 60 * 1000, effect: "cloak" },
                                                                          { id: "shield", name: "Shield", desc: "8 Min lang nicht fangbar.",                 durationMs: 8 * 60 * 1000,  cooldownMs: 25 * 60 * 1000, effect: "shield" },
                                                                              { id: "jammer", name: "Jammer", desc: "6 Min lang nur eingefrorene Position.",   durationMs: 6 * 60 * 1000,  cooldownMs: 25 * 60 * 1000, effect: "jam" }
                                                                                ]
                                                                                };

// State
                                              const state = {
                                                userId:     null,
                                                  userColor:  null,
                                                    myPosition: null,
                                                      lastAccuracy: null,
                                                      lastUpdate: 0,
                                                        watchId:    null,
                                                          markers:    {},   // { userId: L.Marker }
                                                            users:      {},   // { userId: { lat, lng, color, timestamp } }
                                                              map:        null,
                                                                db:         null,
                                                                  myRef:      null,
                                                                    usersRef:   null,
                                                                      dayKey:     null,
                                                                        targetId:  null,
                                                                          targetSeen: null,
                                                                            targetNextUpdateAt: 0,
                                                                              targetRevealInterval: GAME.targetUpdateMs,
                                                                                caughtToday: false,
                                                                                  skipsUsed: 0,
                                                                                    powerupId: null,
                                                                                      powerupActiveUntil: 0,
                                                                                        powerupCooldownUntil: 0,
                                                                                          hiddenUntil: 0,
                                                                                            shieldUntil: 0,
                                                                                              jamUntil: 0,
                                                                                                jamLat: null,
                                                                                                  jamLng: null,
                                                                                                    history: []
                                                                    };

// DOM
                                                                    const DOM = {
                                                                      loading:     document.getElementById("loading"),
                                                                        loadingMsg:  document.getElementById("loading-msg"),
                                                                          statusDot:   document.getElementById("status-dot"),
                                                                            statusText:  document.getElementById("status-text"),
                                                                              userBadge:   document.getElementById("user-badge"),
                                                                                onlineCount: document.getElementById("online-count"),
                                                                                  myLat:       document.getElementById("my-lat"),
                                                                                    myLng:       document.getElementById("my-lng"),
                                                                                      myAcc:       document.getElementById("my-acc"),
                                                                                        myTime:      document.getElementById("my-time"),
                                                                                          errorPanel:  document.getElementById("error-panel"),
                                                                                            userList:    document.getElementById("user-list"),
                                                                                              targetId:   document.getElementById("target-id"),
                                                                                                targetStatus: document.getElementById("target-status"),
                                                                                                  targetLast: document.getElementById("target-last"),
                                                                                                    targetNext: document.getElementById("target-next"),
                                                                                                      catchBtn: document.getElementById("catch-btn"),
                                                                                                        skipBtn: document.getElementById("skip-btn"),
                                                                                                          powerupTitle: document.getElementById("powerup-title"),
                                                                                                            powerupDesc: document.getElementById("powerup-desc"),
                                                                                                              powerupState: document.getElementById("powerup-state"),
                                                                                                                powerupCooldown: document.getElementById("powerup-cooldown"),
                                                                                                                  skipCount: document.getElementById("skip-count"),
                                                                                                                    powerupUse: document.getElementById("powerup-use"),
                                                                                                            powerupCancel: document.getElementById("powerup-cancel"),
                                                                                                                statToday: document.getElementById("stat-today"),
                                                                                                                  statStreak: document.getElementById("stat-streak"),
                                                                                                                    historyList: document.getElementById("history-list"),
                                                                                                                      sidebar: document.getElementById("sidebar"),
                                                                                                                        sheetHandle: document.getElementById("sheet-handle")
                                                                                            };

// Hilfsfunktionen

                                                                                            function generateId() {
                                                                                              return Math.random().toString(36).substring(2, 9).toUpperCase();
                                                                                              }

                                                                                              function randomColor() {
                                                                                                return CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
                                                                                                }

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
        }

function getDayKey() {
  const d = new Date();
    const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
          }

function hashSeed(str) {
  let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h;
      }

function loadIdentity() {
  const storedId = localStorage.getItem("lm_userId");
    const storedColor = localStorage.getItem("lm_userColor");
      if (storedId) state.userId = storedId;
        else {
            state.userId = generateId();
                localStorage.setItem("lm_userId", state.userId);
                  }
                    if (storedColor) state.userColor = storedColor;
                      else {
                          state.userColor = randomColor();
                              localStorage.setItem("lm_userColor", state.userColor);
                                }
                                }

function loadDailyState() {
  const key = localStorage.getItem("lm_dailyState");
    if (!key) return;
      try {
          const data = JSON.parse(key);
              if (data.dayKey !== state.dayKey) return;
                  state.skipsUsed = data.skipsUsed || 0;
                      state.caughtToday = !!data.caughtToday;
                          state.powerupId = data.powerupId || null;
                              state.powerupActiveUntil = data.powerupActiveUntil || 0;
                                  state.powerupCooldownUntil = data.powerupCooldownUntil || 0;
                                    } catch {}
                                    }

function saveDailyState() {
  const data = {
      dayKey: state.dayKey,
          skipsUsed: state.skipsUsed,
              caughtToday: state.caughtToday,
                  powerupId: state.powerupId,
                      powerupActiveUntil: state.powerupActiveUntil,
                          powerupCooldownUntil: state.powerupCooldownUntil
                            };
                              localStorage.setItem("lm_dailyState", JSON.stringify(data));
                              }

function loadHistory() {
  const raw = localStorage.getItem("lm_history");
    if (!raw) return;
      try {
          const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) state.history = parsed;
              } catch {}
              }

function saveHistory() {
  localStorage.setItem("lm_history", JSON.stringify(state.history.slice(-14)));
}

function upsertHistory(dayKey, caught, targetId) {
  const idx = state.history.findIndex(h => h.dayKey === dayKey);
    const entry = { dayKey, caught: !!caught, targetId: targetId || null };
      if (idx >= 0) state.history[idx] = entry;
        else state.history.push(entry);
          saveHistory();
            if (state.db && state.userId) {
                const hRef = ref(state.db, `history/${state.userId}/${dayKey}`);
                    set(hRef, entry).catch(() => {});
                      }
                      }

function watchHistory() {
  if (!state.db || !state.userId) return;
    const hRef = ref(state.db, `history/${state.userId}`);
      onValue(hRef, snap => {
          const data = snap.val() || {};
              const list = Object.values(data);
                  if (Array.isArray(list)) {
                        state.history = list;
                              saveHistory();
                                    updateHistoryUI();
                                        }
                                        });
                                        }

function getPowerupById(id) {
  return GAME.powerups.find(p => p.id === id) || null;
}

function pickPowerup(excludeId) {
  const list = GAME.powerups.filter(p => p.id !== excludeId);
    return list[Math.floor(Math.random() * list.length)];
    }

function ensurePowerup() {
  const now = Date.now();
    if (state.powerupCooldownUntil && now < state.powerupCooldownUntil) return;
      if (!state.powerupId) {
          state.powerupId = pickPowerup(null).id;
              saveDailyState();
                }
                }

function formatCountdown(ts) {
  const ms = ts - Date.now();
    if (ms <= 0) return "bereit";
      const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
            return m > 0 ? `${m}m ${s}s` : `${s}s`;
            }

function computeTargetId() {
  const now = Date.now();
    const others = Object.entries(state.users)
      .filter(([uid, entry]) => uid !== state.userId && isActiveUser(entry, now))
      .map(([uid]) => uid);
  if (others.length === 0) return null;
  others.sort();
  const seed = hashSeed(state.dayKey);
  return others[seed % others.length];
}

function isActiveUser(entry, now) {
  return entry && (now - entry.timestamp) <= CONFIG.inactiveAfterMs;
}

function updateTargetPanel() {
  const now = Date.now();
    if (!state.targetId) {
        DOM.targetId.textContent = "Kein Ziel";
            DOM.targetStatus.textContent = "Warte auf Spieler";
                DOM.targetLast.textContent = "–";
                    DOM.targetNext.textContent = "–";
                        DOM.catchBtn.disabled = true;
                            return;
                            }

                              const target = state.users[state.targetId];
                                let status = "Offline";
                                  if (target) {
                                      const hidden = target.hiddenUntil && target.hiddenUntil > now;
                                          status = hidden ? "Versteckt" : "Online";
                                              if (!hidden && target.shieldUntil && target.shieldUntil > now) status = "Shield aktiv";
                                                }
                                                  if (state.caughtToday && target) status = "Gefangen";

                                                    DOM.targetId.textContent = state.targetId;
                                                      DOM.targetStatus.textContent = status;
                                                        DOM.targetLast.textContent = state.targetSeen ? formatTime(state.targetSeen.ts) : "–";
                                                          DOM.targetNext.textContent = formatCountdown(state.targetNextUpdateAt);

                                                            const shieldActive = target && target.shieldUntil && target.shieldUntil > now;
                                                              const hiddenActive = target && target.hiddenUntil && target.hiddenUntil > now;
                                                                DOM.catchBtn.disabled = state.caughtToday || !target || shieldActive || hiddenActive;
                                                                }

function updatePowerupUI() {
  const now = Date.now();
    const powerup = getPowerupById(state.powerupId);
      const active = state.powerupActiveUntil > now;
        const cooldown = state.powerupCooldownUntil > now;

          DOM.powerupTitle.textContent = powerup ? `Power‑Up · ${powerup.name}` : "Power‑Up –";
            DOM.powerupDesc.textContent = powerup ? powerup.desc : "–";
              DOM.powerupState.textContent = active ? "Aktiv" : "Bereit";
                DOM.powerupState.className = active ? "pill active" : "pill";
                  DOM.powerupCooldown.textContent = cooldown ? `Cooldown ${formatCountdown(state.powerupCooldownUntil)}` : "Cooldown –";
                    DOM.skipCount.textContent = `Skips: ${state.skipsUsed}/${GAME.skipLimit}`;

                      DOM.powerupUse.disabled = !powerup || active || cooldown;
                        DOM.powerupCancel.disabled = !active;
                          DOM.skipBtn.disabled = state.skipsUsed >= GAME.skipLimit || active || cooldown;
                          }

function computeStreak() {
  if (!state.history.length) return 0;
    const sorted = [...state.history].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
      let streak = 0;
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].caught) streak++;
                else break;
                  }
                    return streak;
                    }

function updateHistoryUI() {
  const todayEntry = state.history.find(h => h.dayKey === state.dayKey);
    DOM.statToday.textContent = state.caughtToday ? "Gefangen" : (todayEntry && !todayEntry.caught ? "Verpasst" : "Offen");
      DOM.statStreak.textContent = `${computeStreak()} Tage`;

        const list = [...state.history].sort((a, b) => b.dayKey.localeCompare(a.dayKey)).slice(0, 7);
          DOM.historyList.innerHTML = "";
            for (const item of list) {
                const row = document.createElement("div");
                    row.className = "history-item";
                        const badge = item.caught ? "win" : "lose";
                            const badgeText = item.caught ? "GEFANGEN" : "VERPASST";
                                row.innerHTML = `
      <span>${item.dayKey}</span>
      <span class="badge ${badge}">${badgeText}</span>
    `;
        DOM.historyList.appendChild(row);
  }
  }

function setupMobileSheet() {
  if (!DOM.sidebar || !DOM.sheetHandle) return;
  const mql = window.matchMedia("(max-width: 640px)");
  let startY = 0;
  let currentY = 0;
  let dragging = false;
  let state = "mid";

  const setState = (next) => {
    state = next;
    DOM.sidebar.classList.toggle("sheet-open", next === "open");
    DOM.sidebar.classList.toggle("sheet-mid", next === "mid");
    if (next === "collapsed") {
      DOM.sidebar.classList.remove("sheet-open", "sheet-mid");
    }
  };

  const onTouchStart = (e) => {
    if (!mql.matches) return;
    const target = e.target;
    if (target.closest("#user-list-container")) return;
    dragging = true;
    startY = e.touches[0].clientY;
    currentY = 0;
  };

  const onTouchMove = (e) => {
    if (!dragging || !mql.matches) return;
    const dy = e.touches[0].clientY - startY;
    currentY = dy;
    if (Math.abs(dy) > 6) e.preventDefault();
  };

  const onTouchEnd = () => {
    if (!dragging || !mql.matches) return;
    dragging = false;
    if (currentY > 80) setState("collapsed");
    else if (currentY < -80) setState("open");
    else setState("mid");
  };

  DOM.sidebar.addEventListener("click", (e) => {
    if (!mql.matches) return;
    if (e.target.closest("#user-list-container")) return;
    if (e.target.closest("button")) return;
    setState(state === "open" ? "mid" : "open");
  });
  DOM.sheetHandle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!mql.matches) return;
    setState(state === "open" ? "mid" : "open");
  });
  DOM.sidebar.addEventListener("touchstart", onTouchStart, { passive: true });
  DOM.sidebar.addEventListener("touchmove", onTouchMove, { passive: false });
  DOM.sidebar.addEventListener("touchend", onTouchEnd);

  if (mql.matches) setState("mid");
  mql.addEventListener("change", () => {
    if (!mql.matches) {
      DOM.sidebar.classList.remove("sheet-open", "sheet-mid");
      return;
    }
    setState("mid");
  });
}

function applyPowerupEffectStart(powerup) {
  if (!powerup) return;
    const now = Date.now();
      if (powerup.effect === "reveal" || powerup.effect === "fast") {
          state.targetRevealInterval = GAME.targetFastMs;
              state.targetNextUpdateAt = 0;
                }
                  if (powerup.effect === "ultra") {
                      state.targetRevealInterval = 10 * 1000;
                          state.targetNextUpdateAt = 0;
                            }
                              if (powerup.effect === "cloak") {
                                  state.hiddenUntil = now + powerup.durationMs;
                                    }
                                      if (powerup.effect === "shield") {
                                          state.shieldUntil = now + powerup.durationMs;
                                            }
                                              if (powerup.effect === "jam") {
                                                  if (state.myPosition) {
                                                        state.jamLat = state.myPosition.lat;
                                                              state.jamLng = state.myPosition.lng;
                                                                    }
                                                                        state.jamUntil = now + powerup.durationMs;
                                                                          }
                                                                          }

function applyPowerupEffectEnd(powerup) {
  if (!powerup) return;
    if (powerup.effect === "reveal" || powerup.effect === "fast" || powerup.effect === "ultra") {
        state.targetRevealInterval = GAME.targetUpdateMs;
          }
            if (powerup.effect === "cloak") {
                state.hiddenUntil = 0;
                  }
                    if (powerup.effect === "shield") {
                        state.shieldUntil = 0;
                          }
                            if (powerup.effect === "jam") {
                                state.jamUntil = 0;
                                    state.jamLat = null;
                                        state.jamLng = null;
                                          }
                                          }

function activatePowerup() {
  const now = Date.now();
    const powerup = getPowerupById(state.powerupId);
      if (!powerup) return;
        if (state.powerupCooldownUntil > now || state.powerupActiveUntil > now) return;

          state.powerupActiveUntil = now + powerup.durationMs;
            state.powerupCooldownUntil = state.powerupActiveUntil + powerup.cooldownMs;
              applyPowerupEffectStart(powerup);
                saveDailyState();
                  updatePowerupUI();
                    updateTargetPanel();
                      updateHistoryUI();
                        syncMyState();
                        }

function cancelPowerup() {
  const now = Date.now();
    if (state.powerupActiveUntil <= now) return;
      const powerup = getPowerupById(state.powerupId);
        state.powerupActiveUntil = now;
          applyPowerupEffectEnd(powerup);
            saveDailyState();
              updatePowerupUI();
                updateTargetPanel();
                  updateHistoryUI();
                    syncMyState();
                    }

function skipPowerup() {
  if (state.skipsUsed >= GAME.skipLimit) return;
    const now = Date.now();
      if (state.powerupActiveUntil > now || state.powerupCooldownUntil > now) return;
        const current = state.powerupId;
          state.powerupId = pickPowerup(current).id;
            state.skipsUsed += 1;
              saveDailyState();
                updatePowerupUI();
                }

function catchTarget() {
  const now = Date.now();
    if (!state.targetId) return;
      const target = state.users[state.targetId];
        if (!target) return;
          if (target.hiddenUntil && target.hiddenUntil > now) {
              showError("Ziel ist verborgen – aktuell nicht fangbar.");
                  return;
                    }
                      if (target.shieldUntil && target.shieldUntil > now) {
                          showError("Ziel ist geschützt – aktuell nicht fangbar.");
                              return;
                                }
                                  state.caughtToday = true;
                                    saveDailyState();
                                      upsertHistory(state.dayKey, true, state.targetId);
                                        updateHistoryUI();
                                          updateTargetPanel();
                                            if (state.db) {
                                                const catchRef = ref(state.db, `catches/${state.dayKey}/${state.userId}`);
                                                    set(catchRef, { targetId: state.targetId, timestamp: now }).catch(() => {});
                                                      }
                                                      }

function handleDayChange() {
  const key = getDayKey();
    if (state.dayKey === key) return;
      if (state.dayKey) upsertHistory(state.dayKey, state.caughtToday, state.targetId);
        state.dayKey = key;
          state.caughtToday = false;
            state.skipsUsed = 0;
              state.powerupActiveUntil = 0;
                state.powerupCooldownUntil = 0;
                  state.powerupId = null;
                    state.targetSeen = null;
                      state.targetNextUpdateAt = 0;
                        state.targetRevealInterval = GAME.targetUpdateMs;
                          saveDailyState();
                            ensurePowerup();
                              updateHistoryUI();
                              }

function tick() {
  handleDayChange();
    const now = Date.now();
      if (state.jamUntil && now >= state.jamUntil) {
          state.jamUntil = 0;
              state.jamLat = null;
                  state.jamLng = null;
                      syncMyState();
                        }
                          if (state.powerupActiveUntil && now >= state.powerupActiveUntil) {
                              const powerup = getPowerupById(state.powerupId);
                                  state.powerupActiveUntil = 0;
                                      applyPowerupEffectEnd(powerup);
                                          saveDailyState();
                                              syncMyState();
                                                }
                                                  if (state.powerupCooldownUntil && now >= state.powerupCooldownUntil) {
                                                      state.powerupCooldownUntil = 0;
                                                          ensurePowerup();
                                                              saveDailyState();
                                                                }
                                                                  if (state.hiddenUntil && now >= state.hiddenUntil) {
                                                                      state.hiddenUntil = 0;
                                                                          syncMyState();
                                                                            }
                                                                              if (state.shieldUntil && now >= state.shieldUntil) {
                                                                                  state.shieldUntil = 0;
                                                                                      syncMyState();
                                                                                        }
                                                                                          updatePowerupUI();
                                                                                            updateTargetPanel();
                                                                                              updateHistoryUI();
                                                                                              }

                                                                                                        function setStatus(type, text) {
                                                                                                          DOM.statusDot.className = type;
                                                                                                            DOM.statusText.textContent = text;
                                                                                                            }

                                                                                                            function showError(msg) {
                                                                                                              DOM.errorPanel.style.display = "block";
  DOM.errorPanel.innerHTML = `Warnung: ${msg}`;
}

function showLoadingError(msg) {
  DOM.loading.style.display = "flex";
  DOM.loading.classList.remove("hidden");
  DOM.loadingMsg.textContent = `Fehler beim Laden: ${msg}`;
  setStatus("error", "Fehler beim Laden");
  showError(msg);
}

function hideError() {
  DOM.errorPanel.style.display = "none";
}

function hideLoading() {
  DOM.loading.classList.add("hidden");
  setTimeout(() => DOM.loading.style.display = "none", 600);
}

                                                                                                                      function createMyIcon(color) {
                                                                                                                        return L.divIcon({
                                                                                                                            html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                                                                                                                                  <circle cx="20" cy="20" r="14" fill="${color}" fill-opacity="0.2"/>
                                                                                                                                        <circle cx="20" cy="20" r="8"  fill="${color}"/>
                                                                                                                                              <circle cx="20" cy="20" r="4"  fill="#fff"/>
                                                                                                                                                  </svg>`,
                                                                                                                                                      className: "", iconSize: [40,40], iconAnchor: [20,20], popupAnchor: [0,-24]
                                                                                                                                                        });
                                                                                                                                                        }

                                                                                                                                                        function createUserIcon(color) {
                                                                                                                                                          return L.divIcon({
                                                                                                                                                              html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                                                                                                                                                                    <circle cx="16" cy="16" r="10" fill="${color}" fill-opacity="0.25"/>
                                                                                                                                                                          <circle cx="16" cy="16" r="6"  fill="${color}"/>
                                                                                                                                                                                <circle cx="16" cy="16" r="2.5" fill="#fff"/>
                                                                                                                                                                                    </svg>`,
                                                                                                                                                                                        className: "", iconSize: [32,32], iconAnchor: [16,16], popupAnchor: [0,-18]
                                                                                                                                                                                          });
                                                                                                                                                                                          }

// Karte

function initMap() {
  try {
    state.map = L.map("map", { center: [51.1657, 10.4515], zoom: 6 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(state.map);
    state.map.on("click", () => {
      if (!DOM.sidebar) return;
      DOM.sidebar.classList.remove("sheet-open");
      DOM.sidebar.classList.add("sheet-mid");
    });
  } catch (err) {
    console.error("[Map] Init-Error", err);
    showLoadingError("Karte konnte nicht initialisiert werden. Bitte Seite neu laden.");
    throw err;
  }
}
// Marker-Verwaltung

                                                                                                                                                                                                        function upsertMarker(userId, lat, lng, color, isMe) {
                                                                                                                                                                                                          const latlng = L.latLng(lat, lng);
                                                                                                                                                                                                            const icon   = isMe ? createMyIcon(color) : createUserIcon(color);
                                                                                                                                                                                                              const label  = isMe ? `Ich (${userId})` : `Nutzer ${userId}`;

                                                                                                                                                                                                                if (state.markers[userId]) {
                                                                                                                                                                                                                    state.markers[userId].setLatLng(latlng);
                                                                                                                                                                                                                        state.markers[userId].setIcon(icon);
                                                                                                                                                                                                                          } else {
                                                                                                                                                                                                                              const marker = L.marker(latlng, { icon }).addTo(state.map);
                                                                                                                                                                                                                                  marker.bindPopup(buildPopup(label, color, lat, lng, Date.now()));
                                                                                                                                                                                                                                      state.markers[userId] = marker;
                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                        function buildPopup(label, color, lat, lng, ts) {
                                                                                                                                                                                                                                          return `<b style="color:${color}">${label}</b><br/>
                                                                                                                                                                                                                                              <span style="opacity:.7">Lat:</span> ${lat.toFixed(5)}<br/>
                                                                                                                                                                                                                                                  <span style="opacity:.7">Lng:</span> ${lng.toFixed(5)}<br/>
                                                                                                                                                                                                                                                      <span style="opacity:.7">Zeit:</span> ${formatTime(ts)}`;
                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                      function removeMarker(userId) {
                                                                                                                                                                                                                                                        if (state.markers[userId]) {
                                                                                                                                                                                                                                                            state.map.removeLayer(state.markers[userId]);
                                                                                                                                                                                                                                                                delete state.markers[userId];
                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                  }

// Sidebar

function renderUserList() {
  const now = Date.now();
  const sorted = Object.entries(state.users).sort(([a]) => a === state.userId ? -1 : 1);

  DOM.userList.innerHTML = "";

  let activeCount = 0;
  for (const [uid, data] of sorted) {
    if (!isActiveUser(data, now)) continue;
    const isMe = uid === state.userId;
    const hidden = data.hiddenUntil && data.hiddenUntil > now;
    if (hidden && !isMe) continue;

    const isTarget = uid === state.targetId;
    const display = (isTarget && state.targetSeen) ? state.targetSeen : data;

    activeCount++;
    const card = document.createElement("div");
    card.className = `user-card${isMe ? " is-me" : ""}${isTarget ? " is-target" : ""}`;
    card.innerHTML = `
      <div class="user-card-top">
        <div class="user-avatar" style="background:${data.color}">${uid.charAt(0)}</div>
        <div class="user-name" style="color:${data.color}">${isMe ? "Ich" : (isTarget ? "Ziel" : "Nutzer")} · ${uid}</div>
      </div>
      <div class="user-meta">
        <span><span>LAT</span><span class="ml">${display.lat.toFixed(5)}</span></span>
        <span><span>LNG</span><span class="ml">${display.lng.toFixed(5)}</span></span>
        <span style="grid-column:1/-1"><span>ZULETZT</span><span class="ml">${formatTime(display.ts || data.timestamp)}</span></span>
      </div>`;
    card.addEventListener("click", () => {
      state.map.flyTo([display.lat, display.lng], 15, { duration: 1.2 });
      state.markers[uid]?.openPopup();
    });
    DOM.userList.appendChild(card);
  }

  DOM.onlineCount.textContent = `${activeCount} online`;
}

// Firebase

                                                                                                                                                                                                                                                                                                                                                                                                function uploadPosition(lat, lng, accuracy) {
                                                                                                                                                                                                                                                                                                                                                                                                  const now = Date.now();
                                                                                                                                                                                                                                                                                                                                                                                                    if (now - state.lastUpdate < CONFIG.updateIntervalMs) return;
                                                                                                                                                                                                                                                                                                                                                                                                      state.lastUpdate = now;

                                                                                                                                                                                                                                                                                                                                                                                                        const jamActive = state.jamUntil && now < state.jamUntil && state.jamLat !== null && state.jamLng !== null;
                                                                                                                                                                                                                                                                                                                                                                                                          const sendLat = jamActive ? state.jamLat : lat;
                                                                                                                                                                                                                                                                                                                                                                                                            const sendLng = jamActive ? state.jamLng : lng;

                                                                                                                                                                                                                                                                                                                                                                                                        set(state.myRef, {
                                                                                                                                                                                                                                                                                                                                                                                                            latitude:  sendLat,
                                                                                                                                                                                                                                                                                                                                                                                                                longitude: sendLng,
                                                                                                                                                                                                                                                                                                                                                                                                                    accuracy:  Math.round(accuracy),
                                                                                                                                                                                                                                                                                                                                                                                                                        timestamp: now,
                                                                                                                                                                                                                                                                                                                                                                                                                            color:     state.userColor,
                                                                                                                                                                                                                                                                                                                                                                                                                                userId:    state.userId,
                                                                                                                                                                                                                                                                                                                                                                                                                                  hiddenUntil: state.hiddenUntil || 0,
                                                                                                                                                                                                                                                                                                                                                                                                                                    shieldUntil: state.shieldUntil || 0
                                                                                                                                                                                                                                                                                                                                                                                                                                  }).catch(err => console.error("[Firebase] Upload:", err));
                                                                                                                                                                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                                                                                                                                                                  function syncMyState() {
                                                                                                                                                                                                                                                                                                                                                                                                                                    if (!state.myPosition || !state.myRef) return;
                                                                                                                                                                                                                                                                                                                                                                                                                                      const accuracy = state.lastAccuracy ?? 0;
                                                                                                                                                                                                                                                                                                                                                                                                                                        const now = Date.now();
                                                                                                                                                                                                                                                                                                                                                                                                                                          const jamActive = state.jamUntil && now < state.jamUntil && state.jamLat !== null && state.jamLng !== null;
                                                                                                                                                                                                                                                                                                                                                                                                                                            const sendLat = jamActive ? state.jamLat : state.myPosition.lat;
                                                                                                                                                                                                                                                                                                                                                                                                                                              const sendLng = jamActive ? state.jamLng : state.myPosition.lng;
                                                                                                                                                                                                                                                                                                                                                                                                                                        set(state.myRef, {
                                                                                                                                                                                                                                                                                                                                                                                                                                            latitude:  sendLat,
                                                                                                                                                                                                                                                                                                                                                                                                                                                longitude: sendLng,
                                                                                                                                                                                                                                                                                                                                                                                                                                                    accuracy:  Math.round(accuracy),
                                                                                                                                                                                                                                                                                                                                                                                                                                                        timestamp: now,
                                                                                                                                                                                                                                                                                                                                                                                                                                                            color:     state.userColor,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                userId:    state.userId,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    hiddenUntil: state.hiddenUntil || 0,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        shieldUntil: state.shieldUntil || 0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          }).catch(err => console.error("[Firebase] Sync:", err));
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          }

function watchAllUsers() {
  onValue(state.usersRef, snapshot => {
    const data = snapshot.val() || {};
    const now = Date.now();

    const nextUsers = {};
    for (const [uid, entry] of Object.entries(data)) {
      const normalized = {
        lat: entry.latitude,
        lng: entry.longitude,
        color: entry.color || "#4d8eff",
        timestamp: entry.timestamp || now,
        hiddenUntil: entry.hiddenUntil || 0,
        shieldUntil: entry.shieldUntil || 0
      };
      if (!isActiveUser(normalized, now)) continue;
      nextUsers[uid] = normalized;
    }
    state.users = nextUsers;

    const nextTarget = computeTargetId();
    if (nextTarget !== state.targetId) {
      state.targetId = nextTarget;
      state.targetSeen = null;
      state.targetNextUpdateAt = 0;
    }

    // Entfernte/inaktive Nutzer löschen oder versteckte Marker entfernen
    for (const uid of Object.keys(state.markers)) {
      const u = state.users[uid];
      const hidden = u && u.hiddenUntil && u.hiddenUntil > now;
      if (!u || (hidden && uid !== state.userId)) {
        removeMarker(uid);
        delete state.markers[uid];
      }
    }

    // Alle Nutzer aktualisieren
    for (const [uid, entry] of Object.entries(state.users)) {
      const isMe  = uid === state.userId;
      const hidden = entry.hiddenUntil && entry.hiddenUntil > now;
      if (hidden && !isMe) continue;

      if (uid === state.targetId && !isMe) {
        const shouldUpdate = !state.targetSeen || now >= state.targetNextUpdateAt || state.targetRevealInterval !== GAME.targetUpdateMs;
        if (shouldUpdate) {
          state.targetSeen = { lat: entry.lat, lng: entry.lng, ts: entry.timestamp || now };
          state.targetNextUpdateAt = now + state.targetRevealInterval;
        }
        const lat = state.targetSeen ? state.targetSeen.lat : entry.lat;
        const lng = state.targetSeen ? state.targetSeen.lng : entry.lng;
        const ts  = state.targetSeen ? state.targetSeen.ts : entry.timestamp;
        upsertMarker(uid, lat, lng, entry.color, false);
        const label = `Ziel ${uid}`;
        state.markers[uid]?.setPopupContent(buildPopup(label, entry.color, lat, lng, ts));
      } else {
        upsertMarker(uid, entry.lat, entry.lng, entry.color, isMe);
        const label = isMe ? `Ich (${uid})` : `Nutzer ${uid}`;
        state.markers[uid]?.setPopupContent(buildPopup(label, entry.color, entry.lat, entry.lng, entry.timestamp));
      }
    }

    renderUserList();
    updateTargetPanel();
  }, err => {
    console.error("[Firebase] watchAllUsers Fehler", err);
    showLoadingError("Firebase-Daten konnten nicht geladen werden: " + (err.message || err));
  });
}
// Geolocation

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      function startGeolocation() {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        if (!navigator.geolocation) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            showError("Geolocation wird von diesem Browser nicht unterstützt.");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                setStatus("error", "Geolocation nicht verfügbar");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    hideLoading();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        return;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            state.watchId = navigator.geolocation.watchPosition(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                onPositionUpdate,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    onPositionError,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        CONFIG.geo
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          function onPositionUpdate(pos) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              hideError();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                setStatus("active", "Live · Standort wird übertragen");

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  upsertMarker(state.userId, lat, lng, state.userColor, true);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    DOM.myLat.textContent  = lat.toFixed(5);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      DOM.myLng.textContent  = lng.toFixed(5);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        DOM.myAcc.textContent  = `±${Math.round(accuracy)} m`;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          DOM.myTime.textContent = formatTime(Date.now());

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            if (!state.myPosition) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                state.map.flyTo([lat, lng], 14, { duration: 2 });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  }

                  state.myPosition = { lat, lng };
                    state.lastAccuracy = accuracy;
                    uploadPosition(lat, lng, accuracy);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        hideLoading();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        function onPositionError(err) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          const msgs = {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              [err.PERMISSION_DENIED]:    "Standortzugriff verweigert. Bitte im Browser erlauben.",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  [err.POSITION_UNAVAILABLE]: "Standort nicht verfügbar. GPS oder WLAN aktivieren.",
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      [err.TIMEOUT]:              "Standortabfrage Timeout. Seite neu laden."
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        };
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          showError(msgs[err.code] || `Fehler: ${err.message}`);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            setStatus("error", "Standortfehler");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              hideLoading();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              }

// Cleanup

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              function cleanup() {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                if (state.myRef) remove(state.myRef).catch(() => {});
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  }

window.addEventListener("error", event => {
  console.error("[Global] Fehler", event.error || event.message);
  showLoadingError(event.message || "Unbekannter Fehler");
});

window.addEventListener("unhandledrejection", event => {
  console.error("[Global] Unerwartete Promise-Rejection", event.reason);
  const reason = event.reason?.message || String(event.reason);
  showLoadingError("Unerwarteter Fehler: " + reason);
});

// Init

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  async function init() {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    state.dayKey = getDayKey();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      loadIdentity();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        DOM.userBadge.textContent = state.userId;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          loadDailyState();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            loadHistory();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              if (state.powerupActiveUntil > Date.now()) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                const activePower = getPowerupById(state.powerupId);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  if (activePower) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    if (activePower.effect === "cloak") state.hiddenUntil = state.powerupActiveUntil;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      if (activePower.effect === "shield") state.shieldUntil = state.powerupActiveUntil;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        if (activePower.effect === "reveal" || activePower.effect === "fast") state.targetRevealInterval = GAME.targetFastMs;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          if (activePower.effect === "ultra") state.targetRevealInterval = 10 * 1000;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            if (activePower.effect === "jam") {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              state.jamUntil = state.powerupActiveUntil;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                if (state.myPosition) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  state.jamLat = state.myPosition.lat;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    state.jamLng = state.myPosition.lng;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ensurePowerup();
                                                                                                          updatePowerupUI();
                                                                                                            updateTargetPanel();
                                                                                                              updateHistoryUI();

                                                                                                                DOM.catchBtn.addEventListener("click", catchTarget);
                                                                                                                  DOM.skipBtn.addEventListener("click", skipPowerup);
                                                                                                                    DOM.powerupUse.addEventListener("click", activatePowerup);
                                                                                                                      DOM.powerupCancel.addEventListener("click", cancelPowerup);
                                                                                                                        setInterval(tick, 1000);
                                                                                                                        setupMobileSheet();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          DOM.loadingMsg.textContent = "Initialisiere Karte…";
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            initMap();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              DOM.loadingMsg.textContent = "Verbinde mit Firebase…";
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                try {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    const app    = initializeApp(FIREBASE_CONFIG);
                                                                                                        state.db       = getDatabase(app);
                                                                                                            state.usersRef = ref(state.db, "users");
                                                                                                                state.myRef    = ref(state.db, `users/${state.userId}`);
                                                                                                                onDisconnect(state.myRef).remove();

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    // Verbindungsstatus beobachten
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        const connRef = ref(state.db, ".info/connected");
      onValue(connRef, snap => {
        if (snap.val()) {
          setStatus("active", "Verbunden · Live");
          hideError();
        } else {
          setStatus("", "Verbindung unterbrochen…");
          showError("Verbindung zu Firebase verloren. Warte auf Wiederherstellung...");
        }
      });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                watchAllUsers();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                watchHistory();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    window.addEventListener("beforeunload", cleanup);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      } catch (err) {
        showLoadingError(`Firebase Fehler: ${err.message}`);
        setStatus("error", "Firebase nicht verbunden");
        console.error("[Firebase]", err);
      }

      DOM.loadingMsg.textContent = "Starte Geolocation…";
      startGeolocation();
    }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        init();




