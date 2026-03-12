"use strict";

function initDashboard(hosts, pollIntervalSeconds) {
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

  function updateBulkBar() {
    const count = selectedAddresses.size;
    const bar = document.getElementById("bulk-bar");
    const countEl = document.getElementById("selection-count");
    if (!bar) return;
    bar.classList.toggle("hidden", count === 0);
    countEl.textContent = count + " host" + (count !== 1 ? "s" : "") + " selected";
  }

  function updateSelectAll() {
    const all = document.querySelectorAll(".host-check");
    const selectAllCb = document.getElementById("select-all");
    if (!selectAllCb) return;
    const checked = Array.from(all).filter((cb) => cb.checked).length;
    selectAllCb.indeterminate = checked > 0 && checked < all.length;
    selectAllCb.checked = checked === all.length && all.length > 0;
  }

  function setRowSelected(address, checked) {
    const row = document.querySelector(`tr[data-address="${address}"]`);
    if (row) row.classList.toggle("selected", checked);
    if (checked) selectedAddresses.add(address);
    else selectedAddresses.delete(address);
    updateBulkBar();
    updateSelectAll();
  }

  document.querySelectorAll(".host-check").forEach((cb) => {
    cb.addEventListener("change", () => setRowSelected(cb.dataset.address, cb.checked));
  });

  const selectAllCb = document.getElementById("select-all");
  if (selectAllCb) {
    selectAllCb.addEventListener("change", () => {
      document.querySelectorAll(".host-check").forEach((cb) => {
        cb.checked = selectAllCb.checked;
        setRowSelected(cb.dataset.address, selectAllCb.checked);
      });
    });
  }

  window.clearSelection = function () {
    document.querySelectorAll(".host-check").forEach((cb) => {
      cb.checked = false;
      setRowSelected(cb.dataset.address, false);
    });
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

  window.openBulkCommand = function () {
    if (selectedAddresses.size === 0) return;
    const addrs = Array.from(selectedAddresses).join(", ");
    document.getElementById("cmd-modal-subtitle").textContent =
      selectedAddresses.size + " hosts: " + addrs;
    document.getElementById("cmd-form").reset();
    document.getElementById("cmd-results").className = "cmd-results hidden";
    document.getElementById("cmd-results").innerHTML = "";
    document.getElementById("cmd-modal").classList.remove("hidden");
    document.getElementById("cmd-input").focus();
  };

  window.closeCommand = function () {
    document.getElementById("cmd-modal").classList.add("hidden");
  };

  document.getElementById("cmd-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const command = document.getElementById("cmd-input").value.trim();
    if (!command) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const resultsEl = document.getElementById("cmd-results");
    submitBtn.disabled = true;
    resultsEl.className = "cmd-results hidden";
    resultsEl.innerHTML = "";

    try {
      const res = await fetch("/api/hosts/bulk/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: Array.from(selectedAddresses),
          command,
        }),
      });
      const results = await res.json();
      resultsEl.innerHTML = results.map(renderCommandResult).join("");
      resultsEl.className = "cmd-results";
    } catch (err) {
      resultsEl.innerHTML =
        `<div class="cmd-result-item"><div class="cmd-result-body error-msg">Network error: ${err.message}</div></div>`;
      resultsEl.className = "cmd-results";
    } finally {
      submitBtn.disabled = false;
    }
  });

  function renderCommandResult(r) {
    const ok = !r.error && r.exit_status === 0;
    const badgeClass = ok ? "ok" : "fail";
    const badgeText = r.error ? "Error" : "Exit " + r.exit_status;
    const output = r.error
      ? `<div class="cmd-result-body error-msg">${escHtml(r.error)}</div>`
      : [
          r.stdout ? `<div class="cmd-result-body">${escHtml(r.stdout)}</div>` : "",
          r.stderr ? `<div class="cmd-result-body stderr">${escHtml(r.stderr)}</div>` : "",
        ].join("");

    return `
      <div class="cmd-result-item">
        <div class="cmd-result-header">
          <span class="host-addr">${escHtml(r.address)}</span>
          <span class="exit-badge ${badgeClass}">${badgeText}</span>
        </div>
        ${output || '<div class="cmd-result-body" style="color:var(--muted)">(no output)</div>'}
      </div>`;
  }

  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUpload();
      closeCommand();
    }
  });
}
