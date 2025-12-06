// js/views/monitoringView.js - SISTEMA DE MONITORAMENTO ESTILO ORIGINAL EM FULLSCREEN
const MonitoringView = (function () {
  const root = document.getElementById("view-root");
  let monitoringInterval = null; // Controla o intervalo de atualização de trabalhadores
  let mapRefreshInterval = null; // Controla o intervalo de atualização do mapa (áreas)
  let editingEnabled = false; // Controla se as áreas podem ser movidas/redimensionadas
  let hasAnimatedMapAreas = false; // Evita reiniciar animações a cada atualização

  const getAuthToken = () => {
    try {
      if (typeof AuthModel !== "undefined" && typeof AuthModel.getToken === "function") {
        const token = AuthModel.getToken();
        if (token) return token;
      }
    } catch (err) {
      console.warn("⚠️ Falha ao obter token via AuthModel:", err);
    }
    return localStorage.getItem("connection4_token") || localStorage.getItem("token");
  };

  const normalizeDeviceId = (value) => {
    if (!value) return "";
    return value.toString().trim().toUpperCase();
  };

  function template() {
    return `
        <style>
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          
          /* Modern buttons */
          .btn-modern {
            color: #fff;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
          }
          .btn-modern:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.2); }
          .btn-modern:active { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
          .btn-modern.primary { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
          .btn-modern.secondary { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); }
          .btn-modern.accent { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

          .control-buttons { display:flex; gap:8px; flex-wrap:nowrap; align-items:center; }
            .control-buttons button { flex:0 1 auto; min-width:0; max-width:160px; }
          .control-panel-card { height: calc(100vh - 100px); display:flex; flex-direction:column; }
          .control-panel-card .card-body { flex:1; display:flex; flex-direction:column; gap:12px; padding:12px; }
          .panel-section { border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 16px; }
          .panel-section:last-child { border-bottom: none; padding-bottom: 0; }

          .workers-list { max-height:none; flex:3 1 auto; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:6px; }
          .worker-card { 
            border: 2px solid rgba(59, 130, 246, 0.2);
            border-radius: 16px;
            padding: 12px;
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.4));
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .worker-card:hover {
            transform: translateY(-2px);
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 12px 32px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }
          .worker-card-unauthorized { 
            border-color: rgba(255, 107, 0, 0.6);
            background: linear-gradient(145deg, rgba(255, 107, 0, 0.15), rgba(185, 28, 28, 0.1));
            box-shadow: 0 8px 24px rgba(255, 107, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          .worker-card-danger { 
            border-color: rgba(239, 68, 68, 0.6);
            background: linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          }
          .worker-card .worker-name { font-weight:700; font-size:0.95rem; color: #fff; }
          .worker-card .worker-role { font-size:0.8rem; color: rgba(203, 213, 225, 0.8); }
          .worker-meta { display:flex; flex-wrap:wrap; gap:8px; font-size:0.75rem; color: rgba(148, 163, 184, 0.9); margin-top:8px; }
          .worker-meta span { display:flex; align-items:center; gap:4px; background: rgba(15, 23, 42, 0.5); padding: 3px 8px; border-radius: 8px; }
          .status-pill { padding:4px 10px; border-radius:999px; font-size:0.7rem; font-weight:700; text-transform: uppercase; letter-spacing: 0.5px; }
          .status-pill.warning { background: linear-gradient(135deg, #f59e0b, #d97706); color:#fff; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }
          .status-pill.danger { background: linear-gradient(135deg, #ef4444, #dc2626); color:#fff; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
          .status-pill.success { background: linear-gradient(135deg, #10b981, #059669); color:#fff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }

          /* Alert cards */
          .alert-card { 
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 14px;
            border-radius: 16px;
            border: 2px solid rgba(59, 130, 246, 0.2);
            background: linear-gradient(145deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.4));
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .alert-card:hover {
            transform: translateY(-2px);
            border-color: rgba(59, 130, 246, 0.4);
            box-shadow: 0 12px 32px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }
          .alert-card .alert-icon { 
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          }
          .alert-card .alert-body { flex: 1; }
          .alert-card .alert-title { font-weight: 700; font-size: 0.95rem; color: #fff; }
          .alert-card .alert-sub { font-size: 0.8rem; color: rgba(203, 213, 225, 0.8); margin-top: 4px; }

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
            <!-- Card Único contendo Mapa e Painel -->
            <div class="card shadow-lg border-0" style="background: linear-gradient(145deg, #ffffff, #f8fafc); border-radius: 20px; overflow: hidden;">
                <div class="card-header border-0" style="background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #312e81 100%); padding: 1.5rem;">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="p-2 rounded-circle" style="background: linear-gradient(135deg, #06b6d4, #0284c7); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">
                                        <i class="bi bi-geo-alt-fill text-white fs-4"></i>
                                    </div>
                                    <div class="text-white">
                                        <div class="h5 mb-1 fw-bold" style="letter-spacing: -0.5px;">
                                            <i class="bi bi-map me-2" style="color: #06b6d4;"></i>Mapa Inteligente
                                        </div>
                                        <small class="text-white-75 d-flex align-items-center gap-1">
                                            <i class="bi bi-shield-check" style="color: #10b981;"></i>
                                            Monitoramento em tempo real
                                        </small>
                                    </div>
                                </div>

                                <div class="d-flex align-items-center gap-2 flex-wrap">
                                    <div class="metric-chip text-center p-2 rounded-3" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1)); border: 1px solid rgba(16, 185, 129, 0.3); min-width: 90px;">
                                        <div class="d-flex align-items-center justify-content-center gap-2">
                                            <i class="bi bi-people-fill text-success"></i>
                                            <div>
                                                <div class="fw-bold text-white" id="total-workers">0</div>
                                                <small class="text-white-75" style="font-size: 0.7rem;">Pessoas</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="metric-chip text-center p-2 rounded-3" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); min-width: 90px;">
                                        <div class="d-flex align-items-center justify-content-center gap-2">
                                            <i class="bi bi-broadcast text-warning"></i>
                                            <div>
                                                <div class="fw-bold text-white" id="total-sensors">0</div>
                                                <small class="text-white-75" style="font-size: 0.7rem;">Sensores</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="metric-chip text-center p-2 rounded-3" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1)); border: 1px solid rgba(239, 68, 68, 0.3); min-width: 90px;">
                                        <div class="d-flex align-items-center justify-content-center gap-2">
                                            <i class="bi bi-exclamation-triangle-fill text-danger"></i>
                                            <div>
                                                <div class="fw-bold text-white" id="risk-alerts">0</div>
                                                <small class="text-white-75" style="font-size: 0.7rem;">Alertas</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex align-items-center gap-2">
                                    <div class="form-check form-switch d-flex align-items-center gap-2 p-2 rounded-3" style="background: rgba(255,255,255,0.1);">
                                        <input class="form-check-input" type="checkbox" id="toggle-edit-switch" aria-label="Edição do mapa" style="cursor: pointer;">
                                        <label class="form-check-label small text-white fw-semibold mb-0" for="toggle-edit-switch" id="toggle-edit-label" style="cursor: pointer;">
                                            <i class="bi bi-lock-fill me-1"></i>Bloqueado
                                        </label>
                                    </div>
                                    <button id="toggle-grid" class="btn btn-sm text-white fw-semibold" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px;" title="Mostrar/Esconder grade">
                                        <i class="bi bi-grid-3x3 me-1"></i>Grade
                                    </button>
                                </div>
                </div>
                
                <!-- Layout interno: Mapa + Painel lado a lado -->
                <div class="card-body p-0">
                    <div class="row g-0" style="height: calc(100vh - 220px);">
                        <!-- Área do Mapa -->
                        <div class="col-lg-9">
                            <div class="map-container position-relative h-100" style="background: linear-gradient(145deg, #f8fafc, #f1f5f9);">
                                <div id="map-card" class="card map-card position-absolute w-100 h-100 p-3" style="background:transparent; border:none;">
                                    <div class="map-canvas position-absolute w-100 h-100" id="map-canvas" style="border-radius: 16px; overflow: hidden;">
                                        <!-- mapa será renderizado aqui -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Painel de Controle (dentro do mesmo card, mas separado visualmente) -->
                        <div class="col-lg-3" style="border-left: 3px solid rgba(29, 78, 216, 0.2);">
                            <div class="h-100 d-flex flex-column" style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);">
                                <div class="p-3 border-bottom" style="background: linear-gradient(135deg, rgba(29, 78, 216, 0.15), rgba(49, 46, 129, 0.1)); backdrop-filter: blur(10px);">
                                    <h6 class="mb-0 fw-bold text-white d-flex align-items-center gap-2">
                                        <div class="p-2 rounded-circle" style="background: linear-gradient(135deg, #06b6d4, #0284c7); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">
                                            <i class="bi bi-sliders" style="font-size: 0.9rem;"></i>
                                        </div>
                                        <span style="letter-spacing: -0.3px;">Painel de Controle</span>
                                    </h6>
                                </div>
                                <div class="flex-grow-1 overflow-auto p-3" style="display: flex; flex-direction: column; gap: 20px;">
                                    <!-- Colaboradores Ativos -->
                                    <div class="panel-section flex-grow-1">
                                        <div class="d-flex align-items-center gap-2 mb-3">
                                            <div class="p-2 rounded-3" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1)); border: 1px solid rgba(16, 185, 129, 0.3);">
                                                <i class="bi bi-people-fill" style="color: #10b981; font-size: 1rem;"></i>
                                            </div>
                                            <h6 class="mb-0 fw-bold text-white small">Colaboradores Ativos</h6>
                                        </div>
                                        <div id="workers-list" class="workers-list"></div>
                                    </div>

                                    <!-- Alertas de Segurança -->
                                    <div class="panel-section">
                                        <div class="d-flex align-items-center gap-2 mb-3">
                                            <div class="p-2 rounded-3" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1)); border: 1px solid rgba(239, 68, 68, 0.3);">
                                                <i class="bi bi-exclamation-triangle-fill" style="color: #ef4444; font-size: 1rem;"></i>
                                            </div>
                                            <h6 class="mb-0 fw-bold text-white small">Alertas de Segurança</h6>
                                        </div>
                                        <div id="safety-alerts" class="alerts-list"></div>
                                    </div>

                                    <!-- Controles removidos conforme solicitado -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Fim do Card Principal -->
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
        const token = getAuthToken();
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
        const token = getAuthToken();
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

    // Adicionar grid sofisticado com gradientes (estilo login)
    const grid = document.createElement("div");
    grid.className = "map-grid";
    grid.style.position = 'absolute';
    grid.style.inset = '0';
    grid.style.backgroundImage = `
      repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.12) 0px, transparent 1px, transparent 30px, rgba(148, 163, 184, 0.12) 31px),
      repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.12) 0px, transparent 1px, transparent 30px, rgba(148, 163, 184, 0.12) 31px),
      radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.06), transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.06), transparent 40%)
    `;
    grid.style.backgroundSize = '30px 30px, 30px 30px, 100% 100%, 100% 100%';
    grid.style.pointerEvents = 'none';
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
      areaEl.style.borderRadius = "16px";
      areaEl.style.border = `3px solid ${area.color || '#06b6d4'}`;
      areaEl.style.background = area.color
        ? `linear-gradient(135deg, ${area.color}20, ${area.color}08)`
        : "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.08))";
      areaEl.style.backdropFilter = "blur(8px)";
      areaEl.style.boxShadow = `0 6px 24px ${area.color || '#06b6d4'}35, inset 0 1px 0 rgba(255,255,255,0.15)`;
      areaEl.style.cursor = editingEnabled ? "move" : "default";
      areaEl.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      if (!hasAnimatedMapAreas) {
        areaEl.style.animation = "fadeInUp 0.5s ease-out backwards";
      } else {
        areaEl.style.animation = "none";
      }
      applyGeometryToElement(areaEl, geometry);
      
      // Hover effect
      areaEl.addEventListener('mouseenter', () => {
        if (!editingEnabled) {
          areaEl.style.transform = 'scale(1.02) translateY(-2px)';
          areaEl.style.boxShadow = `0 10px 32px ${area.color || '#06b6d4'}50`;
        }
      });
      areaEl.addEventListener('mouseleave', () => {
        if (!editingEnabled) {
          areaEl.style.transform = 'scale(1) translateY(0)';
          areaEl.style.boxShadow = `0 6px 24px ${area.color || '#06b6d4'}35`;
        }
      });

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
      label.style.left = "10px";
      label.style.top = "10px";
      label.style.display = "flex";
      label.style.justifyContent = "space-between";
      label.style.alignItems = "center";
      label.style.gap = "8px";
      label.style.padding = "6px 12px";
      label.style.background = `linear-gradient(135deg, ${area.color || '#06b6d4'}, ${area.color || '#06b6d4'}dd)`;
      label.style.borderRadius = "10px";
      label.style.boxShadow = `0 3px 10px ${area.color || '#06b6d4'}50`;
      label.style.color = "#fff";
      label.style.fontSize = "0.9rem";
      label.style.fontWeight = "800";
      label.style.textShadow = "0 2px 6px rgba(0,0,0,0.6)";
      label.style.pointerEvents = "none";
      
      const areaIcon = area.isRiskZone ? 'exclamation-triangle-fill' : 
                      area.name.toLowerCase().includes('armazém') ? 'box-seam-fill' :
                      area.name.toLowerCase().includes('produção') ? 'gear-fill' :
                      area.name.toLowerCase().includes('escritório') ? 'building' :
                      area.name.toLowerCase().includes('estacionamento') ? 'car-front-fill' : 'geo-alt-fill';
      
      label.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="bi bi-${areaIcon}"></i>
            <span>${area.name}</span>
          </div>
      `;
      
      // Status LED
      const statusContainer = document.createElement("div");
      statusContainer.style.position = "absolute";
      statusContainer.style.top = "10px";
      statusContainer.style.right = "10px";
      statusContainer.style.display = "flex";
      statusContainer.style.alignItems = "center";
      statusContainer.style.gap = "4px";
      
      const statusLED = document.createElement("div");
      statusLED.style.width = "12px";
      statusLED.style.height = "12px";
      statusLED.style.borderRadius = "50%";
      statusLED.style.background = isOnline ? '#10b981' : '#6b7280';
      statusLED.style.boxShadow = `0 0 12px ${isOnline ? '#10b981' : '#6b7280'}`;
      statusLED.style.animation = isOnline ? 'pulse 2s infinite' : 'none';
      
      statusContainer.appendChild(statusLED);
      
      // Info adicional
      const infoContainer = document.createElement("div");
      infoContainer.style.position = "absolute";
      infoContainer.style.bottom = "10px";
      infoContainer.style.left = "10px";
      infoContainer.style.right = "10px";
      infoContainer.style.display = "flex";
      infoContainer.style.justifyContent = "space-between";
      infoContainer.style.alignItems = "center";
      
      if (area.deviceId) {
        const deviceBadge = document.createElement("div");
        deviceBadge.style.background = "rgba(0,0,0,0.4)";
        deviceBadge.style.color = "#fff";
        deviceBadge.style.padding = "4px 8px";
        deviceBadge.style.borderRadius = "8px";
        deviceBadge.style.fontSize = "0.75rem";
        deviceBadge.style.fontWeight = "700";
        deviceBadge.style.backdropFilter = "blur(4px)";
        deviceBadge.innerHTML = `<i class="bi bi-broadcast-pin"></i> ${area.deviceId}`;
        infoContainer.appendChild(deviceBadge);
      }
      
      areaEl.appendChild(label);
      areaEl.appendChild(statusContainer);
      areaEl.appendChild(infoContainer);

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

    hasAnimatedMapAreas = true;

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
          <div class="alert-card border mb-0" style="border-color: rgba(16, 185, 129, 0.4) !important;">
            <div class="alert-icon" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="bi bi-check-circle"></i></div>
            <div class="alert-body">
              <div class="alert-title">Nenhum acesso não autorizado</div>
              <div class="alert-sub">O sistema não detectou entradas não autorizadas recentemente.</div>
            </div>
          </div>
        `;
    } else {
      alertsContainer.innerHTML = `
          <div class="alert-card border mb-0" style="border-color: rgba(239, 68, 68, 0.6) !important;">
            <div class="alert-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);"><i class="bi bi-exclamation-triangle"></i></div>
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

    // Botões de controle removidos do painel — não há listeners registrados.

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
