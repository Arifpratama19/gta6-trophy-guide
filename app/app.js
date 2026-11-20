/* Leonida Trophy Atlas — offline checklist app. No network calls except
   loading the local trophies.json next to this file. Progress lives in
   localStorage under STORAGE_KEY and never leaves the browser. */
(function () {
  "use strict";

  var STORAGE_KEY = "leonida-trophy-atlas-v1";
  var DATA_URL = "data/trophies.json";

  var trophies = [];
  var byId = {};
  var earned = {};          // id -> true
  var hideSpoilers = true;  // default: story trophies stay hidden until earned
  var activeKind = "";
  var currentDetailId = null;

  var els = {};
  ["search", "gradeFilter", "statusFilter", "spoilerToggle", "kindFilters",
   "exportBtn", "importFile", "resetBtn", "saveNote", "progressText",
   "progressPct", "progressFill", "progressSub", "countLine", "emptyNote",
   "trophyList", "missableCallout", "detailOverlay", "detailClose",
   "detailGrade", "detailName", "detailDesc", "detailMeta", "detailGuide",
   "detailSources", "detailEarned", "roadmap"
  ].forEach(function (id) { els[id] = document.getElementById(id); });

  function gradeIcon(grade) {
    if (grade === "Platinum") return "\u2726";
    if (grade === "Gold") return "\u2605";
    if (grade === "Silver") return "\u25CF";
    return "\u25CF";
  }

  function kindLabel(kind) {
    var labels = {
      story: "Story", side: "Side missions", activity: "Activities",
      combat: "Combat", collectible: "Collectibles", exploration: "Exploration",
      crime: "Crime", money: "Money", completion: "Completion"
    };
    return labels[kind] || kind;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && typeof data === "object") {
        if (data.earned && typeof data.earned === "object") earned = data.earned;
        if (typeof data.hideSpoilers === "boolean") hideSpoilers = data.hideSpoilers;
      }
    } catch (e) { /* corrupted state: start fresh */ earned = {}; }
  }

  function saveState(note) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: earned, hideSpoilers: hideSpoilers }));
      if (note) flashNote(note);
    } catch (e) { flashNote("Could not save — browser storage is unavailable."); }
  }

  var noteTimer = null;
  function flashNote(text) {
    els.saveNote.textContent = text;
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { els.saveNote.textContent = ""; }, 3500);
  }

  function isVisible(t) {
    if (t.spoiler && hideSpoilers && !earned[t.id]) return false;
    if (activeKind && t.kind !== activeKind) return false;
    var grade = els.gradeFilter.value;
    if (grade && t.grade !== grade) return false;
    var status = els.statusFilter.value;
    if (status === "earned" && !earned[t.id]) return false;
    if (status === "unearned" && earned[t.id]) return false;
    if (status === "missable" && !t.missable) return false;
    var q = els.search.value.trim().toLowerCase();
    if (q) {
      var hay = (t.name + " " + t.description + " " + t.guide + " " + t.kind).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function render() {
    var shown = trophies.filter(isVisible);
    var earnedCount = trophies.filter(function (t) { return earned[t.id]; }).length;
    var total = trophies.length;
    var pct = total ? Math.round(earnedCount / total * 100) : 0;

    els.progressText.textContent = earnedCount + " / " + total + " earned";
    els.progressPct.textContent = pct + "%";
    els.progressFill.style.width = pct + "%";
    els.progressSub.textContent = total - earnedCount === 0
      ? "Platinum complete — you're a Leonida Legend."
      : (total - earnedCount) + " to go. Next up: " + nextSuggestion();

    var hiddenSpoilers = trophies.filter(function (t) { return t.spoiler && hideSpoilers && !earned[t.id]; }).length;
    els.countLine.textContent = "Showing " + shown.length + " of " + total + " trophies" +
      (hiddenSpoilers ? " — " + hiddenSpoilers + " story trophies hidden until earned (turn off “Hide story spoilers” to reveal them)." : ".");
    els.emptyNote.hidden = shown.length !== 0;

    els.trophyList.innerHTML = "";
    shown.forEach(function (t) {
      var card = document.createElement("article");
      card.className = "card" + (earned[t.id] ? " earned" : "");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", t.name + ", " + t.grade + (earned[t.id] ? ", earned" : ", not earned"));

      var head = document.createElement("div");
      head.className = "card-head";
      var h = document.createElement("h3");
      h.textContent = t.name;
      var g = document.createElement("span");
      g.className = "grade " + t.grade;
      g.textContent = gradeIcon(t.grade) + " " + t.grade;
      head.appendChild(h); head.appendChild(g);

      var desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = t.description;

      var badges = document.createElement("div");
      badges.className = "badges";
      var kb = document.createElement("span");
      kb.className = "badge"; kb.textContent = kindLabel(t.kind);
      badges.appendChild(kb);
      if (t.missable) {
        var mb = document.createElement("span");
        mb.className = "badge missable"; mb.textContent = "Possibly missable";
        badges.appendChild(mb);
      }
      if (t.spoiler) {
        var sb = document.createElement("span");
        sb.className = "badge spoiler"; sb.textContent = "Story spoiler";
        badges.appendChild(sb);
      }

      var foot = document.createElement("div");
      foot.className = "card-foot";
      var check = document.createElement("span");
      check.className = "check";
      check.textContent = earned[t.id] ? "✓ Earned — click to unmark" : "○ Not earned — click for guide";
      var more = document.createElement("span");
      more.textContent = "Guide →";
      foot.appendChild(check); foot.appendChild(more);

      card.appendChild(head); card.appendChild(desc); card.appendChild(badges); card.appendChild(foot);
      card.addEventListener("click", function () { openDetail(t.id); });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openDetail(t.id); }
      });
      els.trophyList.appendChild(card);
    });

    els.spoilerToggle.checked = hideSpoilers;
  }

  function nextSuggestion() {
    var missable = trophies.find(function (t) { return t.missable && !earned[t.id]; });
    if (missable) return "do the Chapter 1 meditation (" + missable.name + ") before it is gone.";
    var story = trophies.find(function (t) { return t.kind === "story" && !earned[t.id]; });
    if (story) return "keep playing the story (" + story.name + ").";
    var first = trophies.find(function (t) { return !earned[t.id]; });
    return first ? "try " + first.name + "." : "all done.";
  }

  function openDetail(id) {
    var t = byId[id];
    if (!t) return;
    currentDetailId = id;
    els.detailGrade.textContent = gradeIcon(t.grade) + " " + t.grade;
    els.detailName.textContent = t.name;
    els.detailDesc.textContent = t.description;
    els.detailMeta.textContent = kindLabel(t.kind) +
      (t.missable ? " · Possibly missable" : " · Cannot be missed") +
      (t.spoiler ? " · Story spoiler" : "");
    els.detailGuide.textContent = t.guide;
    els.detailSources.textContent = "Sources: " + t.sources.join(" · ") + ". Guides here are written in our own words.";
    els.detailEarned.checked = !!earned[id];
    els.detailOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    if (history.replaceState) history.replaceState(null, "", "#trophy-" + id);
  }

  function closeDetail() {
    currentDetailId = null;
    els.detailOverlay.hidden = true;
    document.body.style.overflow = "";
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }

  function toggleEarned(id, value) {
    if (value) earned[id] = true; else delete earned[id];
    saveState(value ? "Saved — trophy marked earned." : "Saved — trophy unmarked.");
    render();
    if (currentDetailId === id) els.detailEarned.checked = !!earned[id];
  }

  function exportProgress() {
    var payload = {
      app: "leonida-trophy-atlas",
      game: "Grand Theft Auto VI",
      exportedAt: new Date().toISOString(),
      earned: Object.keys(earned).sort()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "gta6-trophy-progress.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    flashNote("Progress exported.");
  }

  function importProgress(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var list = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(list)) throw new Error("bad file");
        var next = {};
        var applied = 0, unknown = 0;
        list.forEach(function (id) {
          if (byId[id]) { next[id] = true; applied++; } else unknown++;
        });
        earned = next;
        saveState("Imported " + applied + " earned trophies" + (unknown ? " (" + unknown + " unknown ids ignored)." : "."));
        render();
      } catch (e) {
        flashNote("That file could not be imported — it is not a valid progress export.");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    els.search.addEventListener("input", render);
    els.gradeFilter.addEventListener("change", render);
    els.statusFilter.addEventListener("change", render);
    els.spoilerToggle.addEventListener("change", function () {
      hideSpoilers = els.spoilerToggle.checked;
      saveState(hideSpoilers ? "Story spoilers hidden." : "Story spoilers revealed.");
      render();
    });
    els.kindFilters.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".kind-btn");
      if (!btn) return;
      activeKind = btn.getAttribute("data-kind") || "";
      els.kindFilters.querySelectorAll(".kind-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      render();
    });
    els.exportBtn.addEventListener("click", exportProgress);
    els.importFile.addEventListener("change", function () {
      importProgress(els.importFile.files[0]);
      els.importFile.value = "";
    });
    els.resetBtn.addEventListener("click", function () {
      if (!window.confirm("Reset the whole checklist? This clears every earned tick in this browser.")) return;
      earned = {};
      saveState("Checklist reset.");
      render();
    });
    els.detailClose.addEventListener("click", closeDetail);
    els.detailOverlay.addEventListener("click", function (ev) {
      if (ev.target === els.detailOverlay) closeDetail();
    });
    els.detailEarned.addEventListener("change", function () {
      if (currentDetailId) toggleEarned(currentDetailId, els.detailEarned.checked);
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !els.detailOverlay.hidden) closeDetail();
    });
  }

  function handleHash() {
    var hash = location.hash || "";
    if (hash.indexOf("#trophy-") === 0) {
      var id = hash.slice("#trophy-".length);
      if (byId[id]) openDetail(id);
    } else if (hash === "#roadmap" && els.roadmap) {
      els.roadmap.scrollIntoView();
    }
  }

  function init() {
    loadState();
    bindEvents();
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("trophies.json failed to load (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        trophies = data.trophies || [];
        trophies.forEach(function (t) { byId[t.id] = t; });
        render();
        handleHash();
      })
      .catch(function (err) {
        els.trophyList.innerHTML = "";
        els.countLine.textContent = "Could not load the trophy list: " + err.message +
          " — make sure data/trophies.json sits next to this page.";
      });
  }

  // Tiny hook for automated checks; harmless in normal use.
  window.ATLAS = {
    get trophies() { return trophies; },
    get earned() { return Object.keys(earned); },
    toggle: toggleEarned
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
