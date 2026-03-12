"use strict";

function initDashboard(hosts, pollIntervalSeconds) {
  let currentUploadAddress = null;

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

  window.openUpload = function (address) {
    currentUploadAddress = address;
    document.getElementById("modal-address").textContent = address;
    document.getElementById("upload-form").reset();
    const statusEl = document.getElementById("upload-status");
    statusEl.className = "upload-status hidden";
    statusEl.textContent = "";
    document.getElementById("upload-modal").classList.remove("hidden");
  };

  window.closeUpload = function () {
    document.getElementById("upload-modal").classList.add("hidden");
    currentUploadAddress = null;
  };

  document.getElementById("upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUploadAddress) return;

    const form = e.target;
    const statusEl = document.getElementById("upload-status");
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    submitBtn.disabled = true;
    statusEl.className = "upload-status hidden";

    try {
      const res = await fetch(`/api/hosts/${currentUploadAddress}/upload`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (res.ok) {
        statusEl.textContent = `Uploaded ${body.filename} to ${body.remote_path} (${body.bytes} bytes)`;
        statusEl.className = "upload-status success";
      } else {
        statusEl.textContent = `Error: ${body.detail || res.statusText}`;
        statusEl.className = "upload-status error";
      }
    } catch (err) {
      statusEl.textContent = `Network error: ${err.message}`;
      statusEl.className = "upload-status error";
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUpload();
  });
}
