// js/views/monitoringView.js - SISTEMA DE MONITORAMENTO ESTILO ORIGINAL EM FULLSCREEN
const MonitoringView = (function () {
  const root = document.getElementById("view-root");
  let monitoringInterval = null; // Controla o intervalo de atualização de trabalhadores
  let mapRefreshInterval = null; // Controla o intervalo de atualização do mapa (áreas)
  let editingEnabled = false; // Controla se as áreas podem ser movidas/redimensionadas

  const normalizeDeviceId = (value) => {
    if (!value) return "";
    return value.toString().trim().toUpperCase();
  };

  function template() {
    return `
        <style>
          /* Modern buttons */
          .btn-modern {
            color: #fff;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 6px 18px rgba(0,0,0,0.12);
            transition: transform .12s ease, box-shadow .12s ease;
            padding: 0.32rem 0.7rem;
            font-size: 0.88rem;
          }
          .btn-modern:active { transform: translateY(1px); box-shadow: 0 3px 12px rgba(0,0,0,0.12); }
          .btn-modern.primary { background: linear-gradient(135deg,#6f42c1 0%,#4b2c97 100%); }
          .btn-modern.secondary { background: linear-gradient(135deg,#0d6efd 0%,#073a8c 100%); }
          .btn-modern.accent { background: linear-gradient(135deg,#ff8a00 0%,#ff5f6d 100%); }

          .control-buttons { display:flex; gap:8px; flex-wrap:nowrap; align-items:center; }
            .control-buttons button { flex:0 1 auto; min-width:0; max-width:160px; }
          .control-panel-card { height: calc(100vh - 210px); display:flex; flex-direction:column; }
          .control-panel-card .card-body { flex:1; display:flex; flex-direction:column; gap:12px; padding:12px; }
          .panel-section { border-bottom:1px solid #f1f3f5; padding-bottom:12px; }
          .panel-section:last-child { border-bottom:none; padding-bottom:0; }

          .workers-list { max-height:none; flex:3 1 auto; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:6px; }
          .worker-card { border:1px solid #eceff3; border-radius:12px; padding:10px; background:#fff; box-shadow:0 5px 12px rgba(18,38,63,0.06); }
          .worker-card-unauthorized { border-color:#ffb38a; background:#fff6f1; }
          .worker-card-danger { border-color:#ff6384; }
          .worker-card .worker-name { font-weight:600; font-size:0.95rem; }
          .worker-card .worker-role { font-size:0.8rem; color:#6c757d; }
          .worker-meta { display:flex; flex-wrap:wrap; gap:8px; font-size:0.75rem; color:#6c757d; margin-top:6px; }
          .worker-meta span { display:flex; align-items:center; gap:4px; }
          .status-pill { padding:2px 8px; border-radius:999px; font-size:0.7rem; font-weight:600; }
          .status-pill.warning { background:#ffe8cc; color:#b65700; }
          .status-pill.danger { background:#ffe4e8; color:#c30032; }
          .status-pill.success { background:#d1f2e1; color:#146c43; }

          /* Alert cards */
          .alert-card { display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:12px; border:1px solid #f1f3f5; background:#fff; box-shadow:0 5px 14px rgba(18,38,63,0.08); }
          .alert-card .alert-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:20px; }
          .alert-card .alert-body { flex:1; }
          .alert-card .alert-title { font-weight:700; font-size:0.95rem; }
          .alert-card .alert-sub { font-size:0.8rem; color:#6c757d; margin-top:2px; }

          /* Glow animations */
          @keyframes alertPulse {
            0% { box-shadow:0 0 0 rgba(255,107,0,0.2); }
            50% { box-shadow:0 0 22px rgba(255,107,0,0.55); }
            100% { box-shadow:0 0 0 rgba(255,107,0,0.2); }
          }
          @keyframes markerPulse {
            0% { transform:translate(-50%, -50%) scale(1); }
            50% { transform:translate(-50%, -50%) scale(1.06); }
            100% { transform:translate(-50%, -50%) scale(1); }
          }
          .map-alert-glow { animation: alertPulse 1.5s ease-in-out infinite; border-radius:16px; border:3px solid rgba(255,107,0,0.55); box-shadow: 0 8px 40px rgba(255,107,0,0.12); }
          /* Removido pulso de marcadores/cards para que apenas o mapa pisque */
          .worker-marker.worker-unauthorized { /* no animation */ }
          .worker-card-unauthorized { /* no animation */ }

          /* Small responsive tweaks */
          @media (max-width: 992px) {
            .map-container { height: 60vh !important; }
            .control-panel-card { height:auto; }
          }
        </style>
        <div class="col-12">
         

            <!-- Layout com Mapa e Painel Lateral -->
            <div class="row">
                <!-- Mapa Principal -->
                <div class="col-lg-9">
                    <div id="map-wrapper" class="card shadow-sm border-0">
                        <div class="card-header map-header d-flex justify-content-between align-items-center">
                            <div class="map-header-left d-flex align-items-center gap-3">
                                <div class="map-title text-white">
                                    <div class="h6 mb-0">Mapa do Canteiro</div>
                                    <small class="text-white-50">Visão geral e controle das áreas</small>
                                </div>
                            </div>

                            <div class="map-header-center d-flex align-items-center gap-2">
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-workers">0</div>
                                    <div class="metric-label small">Colaboradores</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-sensors">0</div>
                                    <div class="metric-label small">Sensores</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded">
                                    <div class="metric-value fw-bold" id="total-devices">0</div>
                                    <div class="metric-label small">Total Ativos</div>
                                </div>
                                <div class="metric-chip text-center bg-light bg-opacity-10 text-white p-2 rounded text-danger">
                                    <div class="metric-value fw-bold" id="risk-alerts">0</div>
                                    <div class="metric-label small">Alertas</div>
                                </div>
                            </div>

                            <div class="map-header-right d-flex align-items-center gap-2">
                                <div class="form-check form-switch text-white d-flex align-items-center gap-2">
                                    <input class="form-check-input" type="checkbox" id="toggle-edit-switch" aria-label="Edição do mapa">
                                    <label class="form-check-label small ms-1 text-white" for="toggle-edit-switch" id="toggle-edit-label">Edição bloqueada</label>
                                </div>
                                <button id="toggle-grid" class="btn btn-sm btn-outline-light" title="Mostrar/Esconder grade">Grade</button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="map-container position-relative bg-light" style="height: calc(100vh - 300px);">
                              <div id="map-card" class="card map-card position-absolute w-100 h-100 p-3" style="background:transparent; border:none;">
                                <div class="map-canvas position-absolute w-100 h-100" id="map-canvas">
                                    <!-- mapa será renderizado aqui -->
                                </div>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Painel de Controle Lateral -->
                <div class="col-lg-3">
                  <div class="card shadow-sm border-0 control-panel-card">
                        <div class="card-header">
                            <h6 class="card-title mb-0 text-white">
                                <i class="bi bi-sliders me-2"></i>Painel de Controle
                            </h6>
                        </div>
                    <div class="card-body">
                      <div class="panel-section flex-grow-1">
                        <h6 class="text-primary mb-2 small">
                          <i class="bi bi-people-fill me-1"></i>Colaboradores Ativos
                        </h6>
                        <div id="workers-list" class="workers-list"></div>
                      </div>
                      <div class="panel-section">
                        <h6 class="text-danger mb-2 small">
                          <i class="bi bi-exclamation-triangle-fill me-1"></i>Alertas de Segurança
                        </h6>
                        <div id="safety-alerts" class="alerts-list"></div>
                      </div>
                      <div class="panel-section">
                   
                          <div style="display:flex; flex-direction:column; gap:8px;">
                            <h6 class="text-success mb-2 small">
                              <i class="bi bi-gear-fill me-1"></i>Controles
                            </h6>
                            <div class="control-footer" style="margin-top:auto; display:flex; justify-content:space-between; gap:8px;">
                              <div class="control-buttons">
                                <button id="btn-refresh" class="btn btn-modern primary">
                                  <i class="bi bi-arrow-clockwise me-1"></i>Atualizar
                                </button>
                                <button id="btn-manage" class="btn btn-modern secondary">
                                  <i class="bi bi-person-gear me-1"></i>RECUROSOS
                                </button>
                                <button id="btn-cadastrar-area" class="btn btn-modern accent">
                                  <i class="bi bi-pin-map me-1"></i>Área
                                </button>
                              </div>
                            </div>
                          </div>
                    </div>
                  </div>
                </div>
            </div>
            <!-- Fim do Row -->

        </div>
        `;
  }

  function updateEditingToggleButton() {
    const checkbox = document.getElementById("toggle-edit-switch");
    const label = document.getElementById("toggle-edit-label");
    if (!checkbox || !label) return;
    checkbox.checked = editingEnabled;
    label.textContent = editingEnabled
      ? "Edição desbloqueada"
      : "Edição bloqueada";
    label.classList.toggle("text-success", editingEnabled);
    label.classList.toggle("text-white", !editingEnabled);
    checkbox.setAttribute("aria-checked", editingEnabled);
  }

  async function renderMap() {
    const canvas = document.getElementById("map-canvas");
    if (!canvas) return;

    const editSwitch = document.getElementById("toggle-edit-switch");
    if (editSwitch) {
      editSwitch.onchange = () => {
        editingEnabled = !!editSwitch.checked;
        updateEditingToggleButton();
        renderMap();
      };
      updateEditingToggleButton();
    }

    canvas.classList.toggle("editing-enabled", editingEnabled);
    canvas.classList.toggle("editing-disabled", !editingEnabled);
    canvas.innerHTML = "";

    const MIN_AREA_SIZE = 0.05;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const createResizeHandles = (areaEl, area) => {
      if (!editingEnabled) return;
      ["nw", "ne", "sw", "se"].forEach((corner) => {
        const handle = document.createElement("div");
        handle.className = `resize-handle resize-${corner}`;
        handle.dataset.corner = corner;
        handle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!editingEnabled) return;
          areaEl.draggable = false;
          startResize(event, area, areaEl, corner);
        });
        areaEl.appendChild(handle);
      });
    };

    const applyGeometryToElement = (el, geometry) => {
      el.style.left = geometry.x * 100 + "%";
      el.style.top = geometry.y * 100 + "%";
      el.style.width = geometry.w * 100 + "%";
      el.style.height = geometry.h * 100 + "%";
    };

    const computeNewGeometry = (initial, deltaX, deltaY, corner) => {
      const right = initial.x + initial.w;
      const bottom = initial.y + initial.h;
      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.w;
      let newH = initial.h;

      if (corner.includes("n")) {
        newY = clamp(initial.y + deltaY, 0, bottom - MIN_AREA_SIZE);
        newH = bottom - newY;
      }

      if (corner.includes("s")) {
        newH = clamp(initial.h + deltaY, MIN_AREA_SIZE, 1 - initial.y);
      }

      if (corner.includes("w")) {
        newX = clamp(initial.x + deltaX, 0, right - MIN_AREA_SIZE);
        newW = right - newX;
      }

      if (corner.includes("e")) {
        newW = clamp(initial.w + deltaX, MIN_AREA_SIZE, 1 - initial.x);
      }

      // Garantir que o retângulo permaneça dentro do canvas
      newW = clamp(newW, MIN_AREA_SIZE, 1 - newX);
      newH = clamp(newH, MIN_AREA_SIZE, 1 - newY);

      return {
        x: Number(newX),
        y: Number(newY),
        w: Number(newW),
        h: Number(newH),
      };
    };

    const persistAreaGeometry = async (areaId, geometry) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Token não encontrado");
        }

        const payload = {
          x: Number(geometry.x.toFixed(4)),
          y: Number(geometry.y.toFixed(4)),
          width: Number(geometry.w.toFixed(4)),
          height: Number(geometry.h.toFixed(4)),
        };

        const response = await fetch(
          `http://localhost:3000/api/zones/${areaId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        console.log("💾 Dimensões da área atualizadas:", payload);
        await AreasModel.refreshAreas();
        await renderMap();
      } catch (error) {
        console.error("❌ Erro ao salvar dimensões da área:", error);
      }
    };

    const startResize = (event, area, areaEl, corner) => {
      if (!editingEnabled) return;
      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const initial = { x: area.x, y: area.y, w: area.w, h: area.h };
      let current = { ...initial };
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      areaEl.classList.add("resizing");

      const onMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        const deltaX = (moveEvent.clientX - startX) / rect.width;
        const deltaY = (moveEvent.clientY - startY) / rect.height;
        current = computeNewGeometry(initial, deltaX, deltaY, corner);
        applyGeometryToElement(areaEl, current);
      };

      const onMouseUp = async () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.userSelect = previousUserSelect;
        areaEl.classList.remove("resizing");
        areaEl.draggable = true;
        area.x = current.x;
        area.y = current.y;
        area.w = current.w;
        area.h = current.h;
        await persistAreaGeometry(area.id, current);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const handleDrop = async (e) => {
      if (!editingEnabled) return;
      e.preventDefault();
      const areaId = e.dataTransfer.getData("areaId");
      if (!areaId) return;
      const offsetX = parseFloat(e.dataTransfer.getData("offsetX")) || 0;
      const offsetY = parseFloat(e.dataTransfer.getData("offsetY")) || 0;

      const rect = canvas.getBoundingClientRect();
      let newX = (e.clientX - rect.left - offsetX) / rect.width;
      let newY = (e.clientY - rect.top - offsetY) / rect.height;

      newX = Math.max(0, Math.min(1, newX));
      newY = Math.max(0, Math.min(1, newY));

      console.log(
        `🎯 Movendo área ${areaId} para (${newX.toFixed(2)}, ${newY.toFixed(
          2
        )})`
      );

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:3000/api/zones/${areaId}/position`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ x: newX, y: newY }),
          }
        );

        if (response.ok) {
          console.log("✅ Posição salva no backend");
          await AreasModel.refreshAreas();
          await renderMap();
        } else {
          console.error("❌ Erro ao salvar posição");
        }
      } catch (error) {
        console.error("❌ Erro ao atualizar posição:", error);
      }
    };

    canvas.ondragover = (e) => {
      if (!editingEnabled) return;
      e.preventDefault();
    };
    canvas.ondrop = handleDrop;

    // Adicionar grid sobre a planta (estilo original)
    const grid = document.createElement("div");
    grid.className = "map-grid";
    canvas.appendChild(grid);

    // ✅ CARREGAR ÁREAS DO BACKEND (assíncrono)
    let workAreas = await AreasModel.loadAreas();
    // Também carregar devices para verificar `device.active` quando necessário
    let devices = [];
    try {
      devices = await DevicesController.getAll();
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível carregar dispositivos ao renderizar mapa:",
        err
      );
      devices = [];
    }
    console.log("📍 Áreas carregadas do backend:", workAreas.length);

    if (!workAreas || workAreas.length === 0) {
      console.warn("⚠️ Nenhuma área encontrada no banco de dados");
      const message = document.createElement("div");
      message.className = "alert alert-warning m-3";
      message.innerHTML = `
        <div class="fw-semibold"><i class="bi bi-pin-map"></i> Nenhuma área cadastrada</div>
        <small>Cadastre zonas no painel de recursos ou vincule dispositivos para aparecerem aqui.</small>
      `;
      canvas.appendChild(message);
      await renderWorkers();
      return;
    }

    for (const area of workAreas) {
      const geometry = {
        x: clamp(Number(area.x ?? 0), 0, 1),
        y: clamp(Number(area.y ?? 0), 0, 1),
        w: clamp(
          Number(area.w ?? area.width ?? MIN_AREA_SIZE),
          MIN_AREA_SIZE,
          1
        ),
        h: clamp(
          Number(area.h ?? area.height ?? MIN_AREA_SIZE),
          MIN_AREA_SIZE,
          1
        ),
      };

      // Manter geometry sincronizada para drag/resize posteriores
      area.x = geometry.x;
      area.y = geometry.y;
      area.w = geometry.w;
      area.h = geometry.h;

      const areaEl = document.createElement("div");
      areaEl.className = "map-area work-area position-absolute";
      areaEl.dataset.areaId = area.id;
      areaEl.draggable = !!editingEnabled;
      areaEl.style.position = "absolute";
      areaEl.style.borderRadius = "18px";
      areaEl.style.border = area.isRiskZone
        ? "2px dashed rgba(220,53,69,0.85)"
        : "1px solid rgba(33,37,41,0.18)";
      areaEl.style.background = area.color
        ? `${area.color}22`
        : "rgba(40,167,69,0.18)";
      areaEl.style.backdropFilter = "blur(2px)";
      areaEl.style.boxShadow = area.isRiskZone
        ? "0 0 18px rgba(220,53,69,0.2)"
        : "0 8px 18px rgba(0,0,0,0.08)";
      areaEl.style.cursor = editingEnabled ? "move" : "default";
      applyGeometryToElement(areaEl, geometry);

      let deviceActiveFlag = true;
      if (area.deviceId) {
        const linked = devices.find(
          (d) =>
            d.id && d.id.toLowerCase() === String(area.deviceId).toLowerCase()
        );
        deviceActiveFlag = linked ? linked.active === true : true;
      }
      const isOnline =
        deviceActiveFlag &&
        area.currentlyActive === true &&
        area.connectionStatus === "online";
      const statusIcon = area.deviceId
        ? isOnline
          ? '<div style="font-size: 13px; font-weight:600; color:#fff; background: rgba(40, 167, 69, 0.95); padding: 6px 10px; border-radius: 14px; margin-top: 6px; display:inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🟢 CONECTADA</div>'
          : '<div style="font-size: 13px; font-weight:600; color:#fff; background: rgba(108, 117, 125, 0.95); padding: 6px 10px; border-radius: 14px; margin-top: 6px; display:inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">⚪ DESCONNECTADA</div>'
        : "";

      console.log(
        `🗺️ Área "${area.name}": currentlyActive=${area.currentlyActive}, status=${area.connectionStatus}, isOnline=${isOnline}`
      );

      const label = document.createElement("div");
      label.className = "area-label";
      label.style.position = "absolute";
      label.style.left = "12px";
      label.style.top = "12px";
      label.style.display = "flex";
      label.style.flexDirection = "column";
      label.style.alignItems = "flex-start";
      label.style.gap = "4px";
      label.style.padding = "10px 14px";
      label.style.background = "linear-gradient(135deg, rgba(20,20,20,0.6), rgba(20,20,20,0.25))";
      label.style.borderRadius = "16px";
      label.style.border = "1px solid rgba(255,255,255,0.2)";
      label.style.color = "#fff";
      label.style.fontSize = "13px";
      label.style.fontWeight = "600";
      label.style.backdropFilter = "blur(6px)";
      label.style.boxShadow = "0 8px 18px rgba(0,0,0,0.25)";
      label.style.pointerEvents = "none";
      label.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; font-size: 15px; letter-spacing:0.5px;">
            <span style="font-size: 22px;">${area.icon || "📍"}</span>
            <span>${area.name}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:11px; text-transform:uppercase; opacity:0.85; letter-spacing:0.4px;">
            ${
              area.deviceId
                ? `<span style='display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,0.12);'><i class='bi bi-broadcast'></i>${area.deviceId}</span>`
                : ''
            }
            ${
              area.isRiskZone
                ? '<span style="padding:2px 8px; border-radius:999px; background:rgba(220,53,69,0.25); color:#ffc2c7;">Zona de Risco</span>'
                : '<span style="padding:2px 8px; border-radius:999px; background:rgba(13,110,253,0.25); color:#cfe2ff;">Área Operacional</span>'
            }
          </div>
          ${statusIcon}
      `;
      areaEl.appendChild(label);

      areaEl.addEventListener("dragstart", function (e) {
        if (!editingEnabled) {
          e.preventDefault();
          return;
        }
        const rect = canvas.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - area.x * rect.width;
        const offsetY = e.clientY - rect.top - area.y * rect.height;
        e.dataTransfer.setData("areaId", area.id);
        e.dataTransfer.setData("offsetX", offsetX);
        e.dataTransfer.setData("offsetY", offsetY);
        areaEl.style.opacity = "0.5";
      });

      areaEl.addEventListener("dragend", function () {
        areaEl.style.opacity = "1";
      });

      if (editingEnabled) {
        createResizeHandles(areaEl, area);
      }

      canvas.appendChild(areaEl);
    }

    // grid toggle: manter referência e estado
    const gridEl = canvas.querySelector(".map-grid");
    let gridVisible = true;
    const toggleBtn = document.getElementById("toggle-grid");
    if (toggleBtn && gridEl) {
      toggleBtn.addEventListener("click", () => {
        gridVisible = !gridVisible;
        gridEl.style.display = gridVisible ? "block" : "none";
      });
    }

    await renderWorkers();
  }

  function getSensorLocation(position) {
    // Usar APENAS AreasModel (3 áreas ESP8266)
    const areas = AreasModel.getAreas();

    for (const area of areas) {
      if (
        position.x >= area.x &&
        position.x <= area.x + area.w &&
        position.y >= area.y &&
        position.y <= area.y + area.h
      ) {
        return area.name;
      }
    }

    return "Área não mapeada";
  }

  function checkIfInRiskArea(position) {
    // Usar propriedade isRiskZone das áreas
    const areas = AreasModel.getAreas();
    const riskAreas = areas.filter((area) => area.isRiskZone === true);

    for (const area of riskAreas) {
      if (
        position.x >= area.x &&
        position.x <= area.x + area.w &&
        position.y >= area.y &&
        position.y <= area.y + area.h
      ) {
        return true;
      }
    }
    return false;
  }

  function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clampPositionToAreaBounds(position, areas) {
    if (!position || !areas || !areas.length) {
      return null;
    }

    let targetArea = null;

    if (position.areaId) {
      targetArea = areas.find(
        (zone) => zone.id && zone.id.toLowerCase() === position.areaId.toLowerCase()
      );
    }

    if (!targetArea) {
      targetArea = areas.find(
        (zone) =>
          position.x >= zone.x &&
          position.x <= zone.x + zone.w &&
          position.y >= zone.y &&
          position.y <= zone.y + zone.h
      );
    }

    if (!targetArea) {
      return null;
    }

    const marginX = Math.min(0.18, Math.max(0.03, targetArea.w * 0.6));
    const marginY = Math.min(0.18, Math.max(0.03, targetArea.h * 0.6));

    const minX = Math.max(0, targetArea.x - marginX);
    const maxX = Math.min(1, targetArea.x + targetArea.w + marginX);
    const minY = Math.max(0, targetArea.y - marginY);
    const maxY = Math.min(1, targetArea.y + targetArea.h + marginY);

    return {
      x: Math.min(maxX, Math.max(minX, position.x)),
      y: Math.min(maxY, Math.max(minY, position.y)),
    };
  }

  function findNearbySensors(
    workerPosition,
    sensorPositions,
    maxDistance = 0.1
  ) {
    const nearbySensors = [];
    for (const [sensorId, sensorPos] of Object.entries(sensorPositions)) {
      const distance = calculateDistance(workerPosition, sensorPos);
      if (distance <= maxDistance) {
        nearbySensors.push({ id: sensorId, distance: distance });
      }
    }
    return nearbySensors.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Verifica se o colaborador tem acesso à área atual e registra alerta se necessário
   * @param {object} person - Dados do colaborador
   * @param {object} position - Posição atual
   * @returns {object} - {hasAccess: boolean, alert: object|null, areaInfo: object}
   */
  function checkAccessAuthorization(person, position) {
    if (!AccessControlModel) {
      return { hasAccess: true, alert: null, areaInfo: null };
    }

    // Detectar em qual área o colaborador está
    const areas = AreasModel.getAreas();
    let currentArea = null;

    for (const area of areas) {
      if (
        position.x >= area.x &&
        position.x <= area.x + area.w &&
        position.y >= area.y &&
        position.y <= area.y + area.h
      ) {
        currentArea = area;
        break;
      }
    }

    if (!currentArea) {
      return { hasAccess: true, alert: null, areaInfo: null };
    }

    // Verificar permissão de acesso
    const accessCheck = AccessControlModel.checkAccess(person, currentArea.id);

    // Se não tem acesso e está em área restrita, registrar alerta
    if (!accessCheck.authorized && accessCheck.restricted) {
      const alert = AccessControlModel.registerAlert({
        type: "UNAUTHORIZED_ACCESS",
        severity: "HIGH",
        workerName: person.name,
        workerRole: person.role,
        deviceId: person.deviceId,
        areaId: currentArea.id,
        areaName: currentArea.name,
        riskLevel: accessCheck.riskLevel,
        position: position,
        reason: accessCheck.reason,
      });

      return { hasAccess: false, alert: alert, areaInfo: currentArea };
    }

    return { hasAccess: true, alert: null, areaInfo: currentArea };
  }

  async function renderWorkers() {
    const canvas = document.getElementById("map-canvas");
    const workersList = document.getElementById("workers-list");

    if (!canvas || !workersList) return;

    const cachedAreas = AreasModel ? AreasModel.getAreas() : [];

    // Remover workers existentes
    canvas
      .querySelectorAll(".worker-marker, .sensor-marker")
      .forEach((el) => el.remove());
    workersList.innerHTML = "";

    try {
      const people = await PeopleController.getAll();
      const devices = await DevicesController.getAll();
      const positions = await MapModel.getDevicePositions();

      let workersCount = 0;
      let sensorsCount = 0;
      let alertsCount = 0;

      // 1. Renderizar dispositivos vinculados a pessoas (workers)
      for (const person of people) {
        const deviceKey = normalizeDeviceId(person.deviceId);
        if (!deviceKey) continue;

        const device = devices.find((d) => d.id === deviceKey);
        const deviceIsActive = device ? device.active : true;
        if (!deviceIsActive) continue;

        let position = positions[deviceKey];
        if (!position) continue;

        const constrained = clampPositionToAreaBounds(position, cachedAreas);
        if (constrained) {
          position = { ...position, ...constrained };
        }

        workersCount++;

        // Verificar autorização de acesso à área atual
        const accessAuth = checkAccessAuthorization(person, position);
        const unauthorizedAccess = !accessAuth.hasAccess;

        // Verificar se está em zona de perigo usando AreasModel
        const inDangerZone = checkIfInRiskArea(position);

        // Contabilizar alertas (zona de perigo OU acesso não autorizado)
        if (unauthorizedAccess) alertsCount++;

        // Verificar proximidade com sensores fixos
        const sensorPositions = {};
        devices
          .filter((d) => d.type === "sensor" && d.active)
          .forEach((s) => {
            const sensorId = normalizeDeviceId(s.id);
            if (positions[sensorId]) {
              sensorPositions[sensorId] = positions[sensorId];
            }
          });
        const nearbySensors = findNearbySensors(position, sensorPositions);
        const detectedBySensor = nearbySensors.length > 0;

        // Criar marker no mapa (estilo original)
        const worker = document.createElement("div");
        // Adicionar classe especial se acesso não autorizado
        const accessClass = unauthorizedAccess ? "worker-unauthorized" : "";
        worker.className = `worker-marker position-absolute ${
          inDangerZone ? "worker-danger" : "worker-safe"
        } ${accessClass}`;
        worker.style.left = position.x * 100 + "%";
        worker.style.top = position.y * 100 + "%";
        worker.style.transform = "translate(-50%, -50%)";

        // Determinar cor do ícone baseado no status
        let iconColor = "#198754"; // Verde padrão (seguro)
        if (unauthorizedAccess) {
          iconColor = "#ff6b00"; // Laranja para acesso não autorizado
        } else if (inDangerZone) {
          iconColor = "#dc3545"; // Vermelho para zona de perigo
        }

        worker.innerHTML = `
                    <div class="worker-icon" style="width: 35px; height: 35px; border-radius: 50%; 
                         background: ${iconColor}; color: white; 
                         display: flex; align-items: center; justify-content: center; 
                         border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                         ${
                           detectedBySensor
                             ? "box-shadow: 0 0 15px rgba(111, 66, 193, 0.6);"
                             : ""
                         }
                         ${
                           unauthorizedAccess ? "" : ""
                         }">
                        <i class="bi bi-person-fill"></i>
                        ${
                          detectedBySensor
                            ? '<div style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; background: #6f42c1; border-radius: 50%; border: 2px solid white;"></div>'
                            : ""
                        }
                        ${
                          unauthorizedAccess
                            ? '<div style="position: absolute; top: -3px; left: -3px; width: 12px; height: 12px; background: #ff6b00; border-radius: 50%; border: 2px solid white;"><i class="bi bi-exclamation-triangle-fill" style="font-size: 8px;"></i></div>'
                            : ""
                        }
                    </div>
                `;

        // Tooltip melhorado com informação de acesso
        let statusText = "SEGURO";
        if (unauthorizedAccess) {
          statusText = "🚫 ACESSO NÃO AUTORIZADO";
        } else if (inDangerZone) {
          statusText = "⚠️ RISCO (Autorizado)";
        }
        const areaText = accessAuth.areaInfo
          ? `\nÁrea: ${accessAuth.areaInfo.name}`
          : "";
        const accessText = unauthorizedAccess
          ? `\n⚠️ ${accessAuth.alert.reason}`
          : "";
        const sensorInfo = detectedBySensor
          ? `\nDetectado por: ${nearbySensors[0].id} (${(
              nearbySensors[0].distance * 100
            ).toFixed(1)}m)`
          : "";

        const deviceLabel = device ? device.id : deviceKey;
        const distanceInfo =
          typeof position.distanceCm === "number"
            ? `${position.distanceCm.toFixed(0)}cm`
            : null;
        const sourceInfoLabel =
          position.source && position.source !== "unknown"
            ? position.source.toUpperCase()
            : null;
        const distanceTooltip = distanceInfo
          ? `\nDistância (ultrassom): ${distanceInfo}`
          : "";
        const sourceTooltip = sourceInfoLabel
          ? `\nOrigem: ${sourceInfoLabel}`
          : "";
        worker.title = `${person.name} - ${person.role}\nDispositivo: ${deviceLabel}\nStatus: ${statusText}${areaText}${accessText}${sensorInfo}${distanceTooltip}${sourceTooltip}`;
        canvas.appendChild(worker);

        // Adicionar na lista lateral
        const workerItem = document.createElement("div");
        const workerCardClasses = ["worker-card"];
        if (unauthorizedAccess) {
          workerCardClasses.push("worker-card-unauthorized");
        } else if (inDangerZone) {
          workerCardClasses.push("worker-card-danger");
        }
        workerItem.className = workerCardClasses.join(" ");

        let statusPill = '<span class="status-pill success">OK</span>';
        if (unauthorizedAccess) {
          statusPill = '<span class="status-pill danger">SEM ACESSO</span>';
        } else if (inDangerZone) {
          statusPill = '<span class="status-pill warning">EM RISCO</span>';
        }

        workerItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="worker-name">${person.name} ${
          detectedBySensor
            ? '<i class="bi bi-broadcast" style="color:#6f42c1;"></i>'
            : ""
        }</div>
                            <div class="worker-role">${person.role}</div>
                        </div>
                        ${statusPill}
                    </div>
                    <div class="worker-meta">
                        <span><i class="bi bi-cpu"></i>${deviceLabel}</span>
                        ${
                          accessAuth.areaInfo
                            ? `<span><i class="bi bi-geo-alt"></i>${accessAuth.areaInfo.name}</span>`
                            : ""
                        }
                        ${
                          detectedBySensor
                            ? `<span><i class="bi bi-broadcast-pin"></i>${nearbySensors[0].id}</span>`
                            : ""
                        }
                    </div>
                    ${
                      unauthorizedAccess
                        ? '<div class="text-danger fw-semibold small mt-2"><i class="bi bi-shield-exclamation me-1"></i>Acesso não autorizado</div>'
                        : !unauthorizedAccess && inDangerZone
                        ? '<div class="text-warning small mt-2"><i class="bi bi-info-circle me-1"></i>Operação autorizada em área de risco</div>'
                        : ""
                    }
                `;
        workersList.appendChild(workerItem);
      }

      // 2. Renderizar sensores independentes (não vinculados a pessoas)
      const linkedDeviceIds = people
        .map((p) => normalizeDeviceId(p.deviceId))
        .filter(Boolean);

      for (const device of devices) {
        // Só renderizar sensores ativos que não estão vinculados a pessoas
        const deviceId = normalizeDeviceId(device.id);
        if (
          device.type !== "sensor" ||
          !device.active ||
          linkedDeviceIds.includes(deviceId)
        )
          continue;

        let position = positions[deviceId];
        if (!position) continue;

        const constrainedSensorPos = clampPositionToAreaBounds(
          position,
          cachedAreas
        );
        if (constrainedSensorPos) {
          position = { ...position, ...constrainedSensorPos };
        }

        sensorsCount++;

        // Verificar se o sensor está em zona de risco (para destacar)
        const inRiskZone = checkIfInRiskArea(position);

        // Determinar localização do sensor usando AreasModel
        const sensorLocation = getSensorLocation(position);

        // Criar marker de sensor FIXO no mapa
        const sensor = document.createElement("div");
        sensor.className = "sensor-marker position-absolute";
        sensor.style.left = position.x * 100 + "%";
        sensor.style.top = position.y * 100 + "%";
        sensor.style.transform = "translate(-50%, -50%)";
        sensor.innerHTML = `
                    <div class="sensor-icon" style="width: 32px; height: 32px; border-radius: 6px; 
                         background: ${
                           inRiskZone ? "#dc3545" : "#6f42c1"
                         }; color: white; 
                         display: flex; align-items: center; justify-content: center; 
                         border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                         position: relative;">
                        <i class="bi bi-broadcast-pin" style="font-size: 14px;"></i>
                        <div style="position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; 
                             background: #28a745; border-radius: 50%; border: 1px solid white;"></div>
                    </div>
                `;

        sensor.title = `Sensor Fixo: ${device.id}\nLocalização: ${sensorLocation}\nTipo: Detector de Proximidade\nStatus: ATIVO`;
        canvas.appendChild(sensor);

        // Adicionar na lista lateral
        const sensorItem = document.createElement("div");
        sensorItem.className = `sensor-item border rounded p-2 mb-2 ${
          inRiskZone
            ? "border-warning bg-warning bg-opacity-10"
            : "border-info bg-info bg-opacity-10"
        }`;
        sensorItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold small">${
                              device.id
                            } <small class="text-muted">(FIXO)</small></div>
                            <div class="text-muted small">${sensorLocation}</div>
                            <div class="text-muted small">Monitor de Proximidade</div>
                        </div>
                        <span class="badge ${
                          inRiskZone ? "bg-warning" : "bg-info"
                        } small">
                            <i class="bi bi-broadcast-pin"></i> SENSOR
                        </span>
                    </div>
                `;
        workersList.appendChild(sensorItem);
      }

      // Atualizar contadores
      document.getElementById("total-workers").textContent = workersCount;
      document.getElementById("total-sensors").textContent = sensorsCount;
      document.getElementById("total-devices").textContent =
        workersCount + sensorsCount;
      document.getElementById("risk-alerts").textContent = alertsCount;

      // Adicionar brilho no wrapper do mapa quando existir alerta não autorizado
      try {
        const mapWrapper = document.getElementById("map-wrapper");
        console.log("🔍 [MAP GLOW DEBUG] mapWrapper encontrado:", !!mapWrapper);
        console.log("🔍 [MAP GLOW DEBUG] alertsCount:", alertsCount);
        if (mapWrapper) {
          if (alertsCount > 0) {
            mapWrapper.classList.add("map-alert-glow");
            console.log("✨ [MAP GLOW] Classe 'map-alert-glow' ADICIONADA ao mapa!");
            console.log("🔍 [MAP GLOW] Classes atuais:", mapWrapper.className);
          } else {
            mapWrapper.classList.remove("map-alert-glow");
            console.log("🔕 [MAP GLOW] Classe 'map-alert-glow' REMOVIDA do mapa");
          }
        } else {
          console.error("❌ [MAP GLOW] Elemento #map-wrapper NÃO encontrado!");
        }
      } catch (e) {
        console.error("❌ [MAP GLOW ERROR]:", e);
      }

      await renderSafetyAlerts(alertsCount);
      await renderAccessAlerts();

      console.log(
        `[MonitoringView] Métricas -> colaboradores: ${workersCount}, sensores: ${sensorsCount}, alertas: ${alertsCount}`
      );
    } catch (error) {
      console.error("Erro ao renderizar workers:", error);
    }
  }

  async function renderAccessAlerts() {
    const alertsContainer = document.getElementById("access-alerts");
    if (!alertsContainer || !AccessControlModel) return;
    const alerts = AccessControlModel.getAlerts() || [];

    if (alerts.length === 0) {
      alertsContainer.innerHTML = `
                <div class="alert alert-success alert-sm mb-0 py-2">
                    <i class="bi bi-check-circle me-1"></i>
                    <small>Todos os acessos autorizados</small>
                </div>
            `;
      return;
    }

    // Deduplicate alerts by id or workerName+timestamp
    const unique = [];
    const seen = new Set();
    for (const a of alerts) {
      const key = a.id || `${a.workerName}-${a.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }

    // Mostrar apenas os últimos 5 alertas mais recentes (após dedupe)
    const recentAlerts = unique.slice(0, 5);

    alertsContainer.innerHTML = recentAlerts
      .map((alert) => {
        const timeAgo = getTimeAgo(new Date(alert.timestamp));
        return `
                <div class="alert-card border bg-white mb-2">
                    <div class="alert-icon bg-warning">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div class="alert-body">
                        <div class="alert-title">🚫 ${alert.workerName} <small class="text-muted">${alert.workerRole}</small></div>
                        <div class="alert-sub">${alert.areaName} • ${timeAgo}</div>
                    </div>
                    <div>
                        <span class="badge bg-warning text-dark small">${alert.riskLevel}</span>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  }

  async function renderSafetyAlerts(alertsCount) {
    const alertsContainer = document.getElementById("safety-alerts");
    if (!alertsContainer) return;
    if (alertsCount === 0) {
      alertsContainer.innerHTML = `
          <div class="alert-card bg-white border mb-0">
            <div class="alert-icon bg-success"><i class="bi bi-check-circle"></i></div>
            <div class="alert-body">
              <div class="alert-title">Nenhum acesso não autorizado</div>
              <div class="alert-sub">O sistema não detectou entradas não autorizadas recentemente.</div>
            </div>
          </div>
        `;
    } else {
      alertsContainer.innerHTML = `
          <div class="alert-card bg-white border mb-0">
            <div class="alert-icon bg-danger"><i class="bi bi-exclamation-triangle"></i></div>
            <div class="alert-body">
              <div class="alert-title">${alertsCount} colaborador(es) sem autorização</div>
              <div class="alert-sub">Verifique as localizações no mapa e consulte o histórico de alertas.</div>
            </div>
          </div>
        `;
    }
  }

  function showRestrictedAreasModal() {
    const modalContent = document.getElementById("restricted-areas-content");
    if (!modalContent || !AccessControlModel) return;

    const restrictedAreas = AccessControlModel.getRestrictedAreas();

    let html = `
            <div class="alert alert-warning">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Sistema de Controle de Acesso Ativo</strong>
                <p class="mb-0 small">Apenas colaboradores autorizados podem acessar áreas restritas. Acessos não autorizados geram alertas automáticos.</p>
            </div>
            
            <h6 class="text-danger mb-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>Áreas de Alto Risco (${restrictedAreas.length})
            </h6>
        `;

    restrictedAreas.forEach((area) => {
      html += `
                <div class="card mb-3 border-danger">
                    <div class="card-header bg-danger text-white">
                        <h6 class="mb-0">${area.icon} ${area.name}</h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-2"><strong>Nível de Risco:</strong> <span class="badge bg-danger">${
                          area.riskLevel
                        }</span></p>
                        <p class="mb-2"><strong>Funções Autorizadas:</strong></p>
                        <div class="d-flex flex-wrap gap-1">
                            ${area.authorizedRoles
                              .map(
                                (role) =>
                                  `<span class="badge bg-success">${role}</span>`
                              )
                              .join("")}
                        </div>
                        <div class="alert alert-warning mt-2 mb-0 py-2">
                            <small><i class="bi bi-shield-exclamation me-1"></i> Acesso restrito - EPIs obrigatórios</small>
                        </div>
                    </div>
                </div>
            `;
    });

    html += `
            <div class="alert alert-info mt-3">
                <h6 class="mb-2">📋 Outras Áreas</h6>
                <p class="mb-1 small"><strong>Áreas Produtivas:</strong> Requerem funções específicas (Pedreiro, Mecânico, etc.)</p>
                <p class="mb-1 small"><strong>Áreas Administrativas e Sociais:</strong> Acesso livre para todos os colaboradores</p>
                <p class="mb-0 small"><i class="bi bi-check-circle me-1"></i> Sistema monitora acessos em tempo real</p>
            </div>
        `;

    modalContent.innerHTML = html;

    // Abrir modal usando Bootstrap 5
    const modal = new bootstrap.Modal(
      document.getElementById("restrictedAreasModal")
    );
    modal.show();
  }

  async function render() {
    if (!root) {
      console.error("Elemento view-root não encontrado");
      return;
    }

    root.innerHTML = template();
    await renderMap();

    // Event listener para botão de áreas restritas
    const btnRestrictedAreas = document.getElementById(
      "btn-show-restricted-areas"
    );
    if (btnRestrictedAreas) {
      btnRestrictedAreas.addEventListener("click", showRestrictedAreasModal);
    }

    // Listeners para botões do painel (modernos)
    const btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) btnRefresh.addEventListener("click", () => location.reload());

    const btnManage = document.getElementById("btn-manage");
    if (btnManage) btnManage.addEventListener("click", () => Router.show("cadastro"));

    const btnCadastrarArea = document.getElementById("btn-cadastrar-area");
    if (btnCadastrarArea) btnCadastrarArea.addEventListener("click", () => Router.show("cadastro"));

    // Limpar intervalo anterior se existir
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      console.log("🛑 Intervalo anterior limpo");
    }

    // Atualizar trabalhadores a cada 3 segundos
    monitoringInterval = setInterval(async () => {
      await renderWorkers();
    }, 3000);

    // ✅ ATUALIZAR MAPA A CADA 5 SEGUNDOS (status das áreas)
    if (mapRefreshInterval) {
      clearInterval(mapRefreshInterval);
    }
    mapRefreshInterval = setInterval(async () => {
      console.log("🗺️ Atualizando status das áreas...");
      await renderMap();
    }, 5000);

    console.log("✅ Monitoramento iniciado - Trabalhadores: 3s | Áreas: 5s");
  }

  // Função para limpar o monitoramento ao sair da view
  function cleanup() {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    if (mapRefreshInterval) {
      clearInterval(mapRefreshInterval);
      mapRefreshInterval = null;
    }
    console.log("🧹 Monitoramento limpo");
  }

  return { render, cleanup };
})();
