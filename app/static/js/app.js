"use strict";

function initDashboard(hosts, pollIntervalSeconds, metricsIntervalSeconds) {
  const selectedAddresses = new Set();
  let uploadMode = "single";
  let singleUploadAddress = null;

  function dotId(address) {
    return "dot-" + address.replace(/\./g, "-");
  }

  function statusId(address) {
    return "status-" + address.replace(/\./g, "-");
  }

  function applyStatus(address, online) {
    const dot = document.getElementById(dotId(address));
    const text = document.getElementById(statusId(address));
    if (!dot || !text) return;
    dot.className = "status-dot " + (online ? "status-online" : "status-offline");
    text.textContent = online ? "Online" : "Offline";
    text.style.color = online ? "var(--success)" : "var(--danger)";
  }

  async function pollStatus() {
    try {
      const res = await fetch("/api/hosts/status");
      if (!res.ok) return;
      const statuses = await res.json();
      statuses.forEach((s) => applyStatus(s.address, s.online));
      const el = document.getElementById("last-updated");
      if (el) el.textContent = new Date().toLocaleTimeString();
    } catch (_) {}
  }

  pollStatus();
  setInterval(pollStatus, pollIntervalSeconds * 1000);

  function metricClass(value) {
    return value >= 85 ? "metric-cell metric-danger"
         : value >= 65 ? "metric-cell metric-warn"
         : "metric-cell metric-ok";
  }

  function applyMetrics(m) {
    const id = m.address.replace(/\./g, "-");
    ["cpu", "mem", "disk"].forEach((type) => {
      const el = document.getElementById("m-" + type + "-" + id);
      if (!el) return;
      if (!m.available) {
        el.textContent = "—";
        el.className = "metric-cell";
      } else {
        el.textContent = m[type].toFixed(1) + "%";
        el.className = metricClass(m[type]);
      }
    });
  }

  async function pollMetrics() {
    try {
      const res = await fetch("/api/hosts/metrics");
      if (!res.ok) return;
      const metrics = await res.json();
      metrics.forEach(applyMetrics);
    } catch (_) {}
  }

  pollMetrics();
  setInterval(pollMetrics, metricsIntervalSeconds * 1000);

  function updateBulkBar() {
    const count = selectedAddresses.size;
    const countEl = document.getElementById("selection-count");
    if (countEl) countEl.textContent = count + " host" + (count !== 1 ? "s" : "") + " selected";
    const disabled = count === 0;
    ["bulk-cluster-ssh", "bulk-send-file", "bulk-push-key"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    const toggle = document.getElementById("bulk-select-toggle");
    if (toggle) toggle.textContent = count > 0 ? "Deselect All" : "Select All";
  }

  function isExcluded(label) {
    return label && (label.includes("{exclude}") || label.includes("[exclude]"));
  }

  function updateSelectAll() {
    const all = Array.from(document.querySelectorAll(".host-check")).filter((cb) => {
      const row = document.querySelector(`tr[data-address="${cb.dataset.address}"]`);
      return !row || !isExcluded(row.dataset.label);
    });
    const selectAllCb = document.getElementById("select-all");
    if (!selectAllCb) return;
    const checked = all.filter((cb) => cb.checked).length;
    selectAllCb.indeterminate = checked > 0 && checked < all.length;
    selectAllCb.checked = checked === all.length && all.length > 0;
  }

  function updateGroupCheckbox(label) {
    if (label == null) return;
    const groupRow = Array.from(document.querySelectorAll(".group-header-row"))
      .find((r) => r.dataset.label === label);
    if (!groupRow) return;
    const groupCb = groupRow.querySelector(".group-check");
    if (!groupCb) return;
    const checks = Array.from(
      document.querySelectorAll("tr[data-address]")
    ).filter((r) => r.dataset.label === label)
     .map((r) => r.querySelector(".host-check"))
     .filter(Boolean);
    const n = checks.filter((c) => c.checked).length;
    groupCb.indeterminate = n > 0 && n < checks.length;
    groupCb.checked = checks.length > 0 && n === checks.length;
  }

  function updateAllGroupCheckboxes() {
    document.querySelectorAll(".group-header-row").forEach((r) => updateGroupCheckbox(r.dataset.label));
  }

  function setRowSelected(address, checked) {
    const row = document.querySelector(`tr[data-address="${address}"]`);
    if (row) row.classList.toggle("selected", checked);
    if (checked) selectedAddresses.add(address);
    else selectedAddresses.delete(address);
    updateBulkBar();
    updateSelectAll();
    if (row) updateGroupCheckbox(row.dataset.label);
  }

  document.querySelectorAll(".host-check").forEach((cb) => {
    cb.addEventListener("change", () => setRowSelected(cb.dataset.address, cb.checked));
  });

  const selectAllCb = document.getElementById("select-all");
  if (selectAllCb) {
    selectAllCb.addEventListener("change", () => {
      const val = selectAllCb.checked;
      document.querySelectorAll(".host-check").forEach((cb) => {
        const row = document.querySelector(`tr[data-address="${cb.dataset.address}"]`);
        if (val && row && isExcluded(row.dataset.label)) return;
        cb.checked = val;
        setRowSelected(cb.dataset.address, val);
      });
      updateAllGroupCheckboxes();
    });
  }

  window.toggleSelection = function () {
    const anySelected = selectedAddresses.size > 0;
    document.querySelectorAll(".host-check").forEach((cb) => {
      if (!anySelected) {
        const row = document.querySelector(`tr[data-address="${cb.dataset.address}"]`);
        if (row && isExcluded(row.dataset.label)) return;
      }
      cb.checked = !anySelected;
      setRowSelected(cb.dataset.address, !anySelected);
    });
    updateAllGroupCheckboxes();
  };

  window.clearSelection = function () {
    document.querySelectorAll(".host-check").forEach((cb) => {
      cb.checked = false;
      setRowSelected(cb.dataset.address, false);
    });
    updateAllGroupCheckboxes();
  };

  window.openClusterSSH = function () {
    if (selectedAddresses.size === 0) return;
    const hostsParam = Array.from(selectedAddresses).join(",");
    window.open("/terminal/multi?hosts=" + encodeURIComponent(hostsParam), "_blank");
  };

  function resetUploadModal() {
    document.getElementById("upload-form").reset();
    const statusEl = document.getElementById("upload-status");
    statusEl.className = "upload-status hidden";
    statusEl.textContent = "";
  }

  window.openUpload = function (address) {
    uploadMode = "single";
    singleUploadAddress = address;
    document.getElementById("upload-modal-subtitle").textContent = "Host: " + address;
    resetUploadModal();
    document.getElementById("upload-modal").classList.remove("hidden");
  };

  window.openBulkUpload = function () {
    if (selectedAddresses.size === 0) return;
    uploadMode = "bulk";
    singleUploadAddress = null;
    const addrs = Array.from(selectedAddresses).join(", ");
    document.getElementById("upload-modal-subtitle").textContent =
      selectedAddresses.size + " hosts: " + addrs;
    resetUploadModal();
    document.getElementById("upload-modal").classList.remove("hidden");
  };

  window.closeUpload = function () {
    document.getElementById("upload-modal").classList.add("hidden");
  };

  document.getElementById("upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    const statusEl = document.getElementById("upload-status");
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    statusEl.className = "upload-status hidden";

    try {
      if (uploadMode === "single") {
        const formData = new FormData(form);
        const res = await fetch(`/api/hosts/${singleUploadAddress}/upload`, {
          method: "POST",
          body: formData,
        });
        const body = await res.json();
        if (res.ok) {
          statusEl.textContent = `Uploaded ${body.filename} to ${body.remote_path} (${body.bytes} bytes)`;
          statusEl.className = "upload-status success";
        } else {
          statusEl.textContent = "Error: " + (body.detail || res.statusText);
          statusEl.className = "upload-status error";
        }
      } else {
        const formData = new FormData(form);
        Array.from(selectedAddresses).forEach((addr) =>
          formData.append("addresses", addr)
        );
        const res = await fetch("/api/hosts/bulk/upload", {
          method: "POST",
          body: formData,
        });
        const results = await res.json();
        const failed = results.filter((r) => !r.ok);
        if (failed.length === 0) {
          statusEl.textContent = `Uploaded to all ${results.length} hosts.`;
          statusEl.className = "upload-status success";
        } else {
          statusEl.textContent =
            `${results.length - failed.length}/${results.length} succeeded. ` +
            "Failed: " + failed.map((r) => r.address + " — " + r.error).join("; ");
          statusEl.className = "upload-status error";
        }
      }
    } catch (err) {
      statusEl.textContent = "Network error: " + err.message;
      statusEl.className = "upload-status error";
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUpload();
      closeNote();
      closePower();
      closePushKey();
    }
  });

  window.openNote = function (address, name) {
    document.getElementById("note-address").value = address;
    document.getElementById("note-modal-subtitle").textContent = name + " (" + address + ")";
    fetch("/api/hosts/" + address + "/note")
      .then((r) => r.json())
      .then((data) => { document.getElementById("note-text").value = data.note || ""; });
    document.getElementById("note-modal").classList.remove("hidden");
    setTimeout(() => document.getElementById("note-text").focus(), 50);
  };

  window.closeNote = function () {
    document.getElementById("note-modal").classList.add("hidden");
  };

  window.saveNote = async function () {
    const address = document.getElementById("note-address").value;
    const note = document.getElementById("note-text").value;
    await fetch("/api/hosts/" + address + "/note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const safeId = address.replace(/\./g, "-");
    const btn = document.getElementById("note-btn-" + safeId);
    if (btn) btn.classList.toggle("btn-note-filled", note.trim().length > 0);
    closeNote();
  };

  let powerAction = null;
  let powerAddress = null;

  window.confirmPower = function (action, address, name) {
    powerAction = action;
    powerAddress = address;
    const label = action === "reboot" ? "Reboot" : "Shutdown";
    document.getElementById("power-modal-title").textContent = label + " host";
    document.getElementById("power-modal-body").textContent =
      "Are you sure you want to " + action + " " + name + " (" + address + ")?";
    const confirmBtn = document.getElementById("power-confirm-btn");
    confirmBtn.textContent = label;
    confirmBtn.className = "btn " + (action === "reboot" ? "btn-reboot" : "btn-shutdown");
    confirmBtn.onclick = executePower;
    document.getElementById("power-status").className = "upload-status hidden";
    document.getElementById("power-modal").classList.remove("hidden");
  };

  window.closePower = function () {
    document.getElementById("power-modal").classList.add("hidden");
  };

  async function executePower() {
    const statusEl = document.getElementById("power-status");
    const confirmBtn = document.getElementById("power-confirm-btn");
    confirmBtn.disabled = true;
    try {
      const res = await fetch("/api/hosts/" + powerAddress + "/" + powerAction, { method: "POST" });
      if (res.ok) {
        statusEl.textContent = "Command sent.";
        statusEl.className = "upload-status success";
      } else {
        const body = await res.json();
        statusEl.textContent = "Error: " + (body.detail || res.statusText);
        statusEl.className = "upload-status error";
      }
    } catch (err) {
      statusEl.textContent = "Network error: " + err.message;
      statusEl.className = "upload-status error";
    } finally {
      confirmBtn.disabled = false;
    }
  }

  window.openPushKey = function () {
    if (selectedAddresses.size === 0) return;
    const addrs = Array.from(selectedAddresses).join(", ");
    document.getElementById("push-key-modal-subtitle").textContent =
      selectedAddresses.size + " hosts: " + addrs;
    document.getElementById("push-key-status").className = "upload-status hidden";
    document.getElementById("push-key-form").reset();
    document.getElementById("push-key-modal").classList.remove("hidden");
  };

  window.closePushKey = function () {
    document.getElementById("push-key-modal").classList.add("hidden");
  };

  document.getElementById("push-key-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("push-key-status");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const formData = new FormData(e.target);
    Array.from(selectedAddresses).forEach((addr) => formData.append("addresses", addr));
    try {
      const res = await fetch("/api/hosts/bulk/push-key", { method: "POST", body: formData });
      const results = await res.json();
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        statusEl.textContent = "Key pushed to all " + results.length + " hosts.";
        statusEl.className = "upload-status success";
      } else {
        statusEl.textContent =
          (results.length - failed.length) + "/" + results.length + " succeeded. " +
          "Failed: " + failed.map((r) => r.address + " — " + r.error).join("; ");
        statusEl.className = "upload-status error";
      }
    } catch (err) {
      statusEl.textContent = "Network error: " + err.message;
      statusEl.className = "upload-status error";
    } finally {
      submitBtn.disabled = false;
    }
  });

  initLabelFilter(setRowSelected);
}

function initLabelFilter(setRowSelected) {
  const container = document.getElementById("label-filter");
  const tbody = document.getElementById("host-tbody");
  if (!container || !tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr[data-address]"));

  const labelSet = new Set();
  rows.forEach((r) => { if (r.dataset.label) labelSet.add(r.dataset.label); });

  if (labelSet.size === 0) return;

  const labels = Array.from(labelSet).sort();

  rows.sort((a, b) => (a.dataset.label || "").localeCompare(b.dataset.label || ""));

  let lastLabel = null;
  rows.forEach((row) => {
    const label = row.dataset.label || "";
    if (label !== lastLabel) {
      const headerRow = document.createElement("tr");
      headerRow.className = "group-header-row";
      headerRow.dataset.label = label;

      const checkTd = document.createElement("td");
      checkTd.className = "col-check";
      const groupCb = document.createElement("input");
      groupCb.type = "checkbox";
      groupCb.className = "group-check";
      groupCb.title = "Select group";
      groupCb.addEventListener("change", () => {
        const val = groupCb.checked;
        const groupRows = Array.from(tbody.querySelectorAll("tr[data-address]"))
          .filter((r) => r.dataset.label === label);
        groupRows.forEach((r) => {
          const cb = r.querySelector(".host-check");
          if (cb) {
            cb.checked = val;
            setRowSelected(cb.dataset.address, val);
          }
        });
      });
      checkTd.appendChild(groupCb);

      const labelTd = document.createElement("td");
      labelTd.colSpan = 8;
      labelTd.className = "group-label-cell";
      labelTd.textContent = label || "Unlabeled";

      headerRow.appendChild(checkTd);
      headerRow.appendChild(labelTd);
      tbody.appendChild(headerRow);
      lastLabel = label;
    }
    tbody.appendChild(row);
  });

  function makePill(text, labelValue, active) {
    const btn = document.createElement("button");
    btn.className = "label-pill" + (active ? " active" : "");
    btn.textContent = text;
    btn.addEventListener("click", () => setFilter(labelValue));
    return btn;
  }

  container.appendChild(makePill("All", null, true));
  labels.forEach((label) => container.appendChild(makePill(label, label, false)));

  function setFilter(label) {
    container.querySelectorAll(".label-pill").forEach((pill) => {
      pill.classList.toggle("active", pill.textContent === (label === null ? "All" : label));
    });

    rows.forEach((row) => {
      row.style.display = (label === null || row.dataset.label === label) ? "" : "none";
    });

    tbody.querySelectorAll(".group-header-row").forEach((hr) => {
      hr.style.display = (label === null || hr.dataset.label === label) ? "" : "none";
    });
  }
}
