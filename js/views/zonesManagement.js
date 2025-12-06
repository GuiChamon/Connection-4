// js/views/zonesManagement.js - Gestão de Áreas com visual renovado
const ZonesManagementView = (function(){
    const API_URL = 'http://localhost:3000/api/zones';
    let refreshInterval = null;
    let zonesCache = [];
    let devicesCache = [];
    let editingZoneId = null;
    let previewInteractionsBound = false;

    const LIST_STATE = {
        filters: {
            search: '',
            risk: 'all',
            level: 'all',
            status: 'all',
            linkage: 'all',
            sort: 'name-asc'
        },
        page: 1,
        perPage: 5,
        filtersOpen: false
    };

    const FILTER_CONFIG = {
        zones: { panelId: 'zones-filter-panel' }
    };

    function getAuthToken(){
        if (typeof AuthModel !== 'undefined' && AuthModel.getToken) {
            return AuthModel.getToken();
        }
        return localStorage.getItem('connection4_token') || localStorage.getItem('token');
    }

    const RISK_LEVEL_LABELS = {
        '1': 'Nível 1 • Áreas comuns',
        '2': 'Nível 2 • Risco moderado',
        '3': 'Nível 3 • Áreas críticas',
        none: 'Nível 1 • Áreas comuns',
        low: 'Nível 1 • Áreas comuns',
        medium: 'Nível 2 • Risco moderado',
        high: 'Nível 3 • Áreas críticas',
        critical: 'Nível 3 • Áreas críticas'
    };

    const ICON_SUGGESTIONS = ['📍', '🏗️', '🚧', '🏢', '🏭', '🛠️', '🏗', '🏥', '🚨', '🛰️'];
    const COLOR_PRESETS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#F97316', '#EC4899', '#22D3EE', '#6B7280', '#14B8A6', '#EAB308'];
    const LEGACY_RISK_LEVEL_MAP = {
        none: '1',
        low: '1',
        medium: '2',
        high: '3',
        critical: '3'
    };
    const MIN_ZONE_SIZE = 0.05;
    const previewInteractionState = {
        active: false,
        mode: 'idle',
        handle: null,
        pointerId: null,
        pointerTarget: null,
        offset: { x: 0, y: 0 },
        startValues: null,
        canvasRect: null
    };

    function template(){
        return `
        <div class="col-12 zone-dashboard">
            <div class="zone-hero card border-0 shadow-sm mb-4">
                <div class="zone-hero__body">
                    <div class="zone-hero__main">
                        <span class="hero-chip">Topografia inteligente</span>
                        <h2 class="zone-hero__title">Gestão de áreas e zonas</h2>
                        <p class="zone-hero__subtitle">Mapeie zonas críticas, conecte dispositivos e visualize a ocupação em tempo real.</p>
                        <div class="zone-hero__stats">
                            <div class="hero-stat">
                                <span class="hero-stat__label">Áreas mapeadas</span>
                                <span class="hero-stat__value" id="zones-total-count">0</span>
                                <span class="hero-stat__meta">Em operação</span>
                            </div>
                            <div class="hero-stat">
                                <span class="hero-stat__label">Zonas de risco</span>
                                <span class="hero-stat__value" id="zones-risk-count">0</span>
                                <span class="hero-stat__meta">Monitoradas</span>
                            </div>
                            <div class="hero-stat">
                                <span class="hero-stat__label">Dispositivos ativos</span>
                                <span class="hero-stat__value" id="zones-connected-count">0</span>
                                <span class="hero-stat__meta">Linked ESP8266</span>
                            </div>
                            <div class="hero-stat">
                                <span class="hero-stat__label">Cobertura mapeada</span>
                                <span class="hero-stat__value" id="zones-coverage-percent">0%</span>
                                <span class="hero-stat__meta">Área ocupada</span>
                            </div>
                        </div>
                    </div>
                    <div class="zone-hero__actions">
                        <div class="zone-hero__cta">
                            <p class="zone-hero__cta-kicker">Nova zona</p>
                            <h5 class="zone-hero__cta-title">Cadastrar área manualmente</h5>
                            <button class="btn btn-light fw-semibold" data-zone-modal-trigger="create">
                                <i class="bi bi-plus-circle me-1"></i>Criar área
                            </button>
                        </div>
                        <button class="btn btn-outline-light" id="zones-refresh-btn">
                            <i class="bi bi-arrow-repeat me-1"></i>Atualizar lista
                        </button>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm zone-list-card">
                <div class="card-header card-header--toolbar">
                    <div>
                        <h5 class="card-title mb-0 text-white d-flex flex-column">
                            <span>
                                <i class="bi bi-layers-half me-2"></i>Zonas cadastradas
                                <span class="badge bg-light text-primary ms-2" id="zones-count">0</span>
                            </span>
                            <small class="card-subtitle text-white-50">Filtre por risco, dispositivo e status de conexão</small>
                        </h5>
                    </div>
                    <div class="card-toolbar card-toolbar--compact">
                        <button class="btn btn-outline-light btn-filter" data-filter-toggle="zones" aria-expanded="false">
                            <i class="bi bi-funnel me-1"></i>Filtros
                        </button>
                        <div class="card-toolbar__pagination">
                            <button class="btn btn-outline-light btn-icon" id="zones-prev" aria-label="Página anterior">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <span class="pagination-label" id="zones-page-info">Página 1 de 1</span>
                            <button class="btn btn-outline-light btn-icon" id="zones-next" aria-label="Próxima página">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-filter-panel" id="zones-filter-panel" aria-hidden="true">
                    <div class="card-filter-panel__content">
                        <div class="filter-field">
                            <label class="filter-label" for="zones-search">Buscar área</label>
                            <div class="toolbar-input input-icon-wrapper">
                                <span class="input-icon-symbol"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control input-with-icon" id="zones-search" placeholder="Nome, ID ou descrição">
                            </div>
                        </div>
                        <div class="filter-field">
                            <label class="filter-label" for="zones-risk-filter">Zona de risco</label>
                            <select class="form-select" id="zones-risk-filter">
                                <option value="all">Todas</option>
                                <option value="risk">Somente risco</option>
                                <option value="safe">Somente seguras</option>
                            </select>
                        </div>
                        <div class="filter-field">
                            <label class="filter-label" for="zones-status-filter">Status online</label>
                            <select class="form-select" id="zones-status-filter">
                                <option value="all">Todos</option>
                                <option value="online">Conectada</option>
                                <option value="offline">Desconectada</option>
                            </select>
                        </div>
                        <div class="filter-field">
                            <label class="filter-label" for="zones-linkage-filter">Vínculo</label>
                            <select class="form-select" id="zones-linkage-filter">
                                <option value="all">Com e sem dispositivo</option>
                                <option value="linked">Apenas vinculadas</option>
                                <option value="unlinked">Sem dispositivo</option>
                            </select>
                        </div>
                        <div class="filter-field">
                            <label class="filter-label" for="zones-level-filter">Nível de risco</label>
                            <select class="form-select" id="zones-level-filter">
                                <option value="all">Todos</option>
                                <option value="1">Nível 1 • Áreas comuns</option>
                                <option value="2">Nível 2 • Risco moderado</option>
                                <option value="3">Nível 3 • Áreas críticas</option>
                            </select>
                        </div>
                        <div class="filter-field">
                            <label class="filter-label" for="zones-sort">Ordenar por</label>
                            <select class="form-select" id="zones-sort">
                                <option value="name-asc">Nome (A → Z)</option>
                                <option value="name-desc">Nome (Z → A)</option>
                                <option value="risk-desc">Risco (maior primeiro)</option>
                                <option value="status-desc">Status (online primeiro)</option>
                                <option value="size-desc">Área (maior primeiro)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-body zone-list-body">
                    <div id="zones-list" class="zone-list-grid">
                        <div class="empty-state">
                            <i class="bi bi-inbox display-5 text-muted mb-3"></i>
                            <p class="text-muted mb-0">Inicie um novo cadastro para visualizar suas áreas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="zone-modal" id="zone-modal" aria-hidden="true">
                <div class="zone-modal__dialog">
                    <button type="button" class="zone-modal__close" id="zone-modal-close" aria-label="Fechar modal">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <div class="zone-modal__header">
                        <div>
                            <p class="zone-modal__kicker" id="zone-modal-kicker">Nova área</p>
                            <h3 class="zone-modal__title" id="zone-modal-title">Cadastrar nova zona</h3>
                            <p class="zone-modal__subtitle">Preencha os dados abaixo e visualize o preview imediatamente.</p>
                        </div>
                        <span class="zone-modal__badge" id="zone-modal-mode-label">Criação</span>
                    </div>
                    <form id="zone-form" autocomplete="off">
                        <input type="hidden" id="zone-edit-id">
                        <input type="hidden" id="zone-id">
                        <div class="zone-modal__grid">
                            <div class="zone-modal__form">
                                <div class="zone-field-card zone-field-card--stack">
                                    <div class="compact-field">
                                        <label for="zone-name" class="form-label form-label-icon">
                                            <i class="bi bi-input-cursor-text"></i>Nome da área *
                                        </label>
                                        <input type="text" class="form-control" id="zone-name" placeholder="Ex: Escritório Central" required>
                                    </div>
                                    <div class="zone-inline-grid">
                                        <div class="compact-field">
                                            <label for="zone-color" class="form-label"><i class="bi bi-palette me-1"></i>Cor</label>
                                            <input type="color" class="form-control form-control-color zone-color-input" id="zone-color" value="#2563eb">
                                            <div class="zone-color-palette" id="zone-color-palette"></div>
                                        </div>
                                        <div class="compact-field">
                                            <label for="zone-icon" class="form-label"><i class="bi bi-emoji-smile me-1"></i>Ícone</label>
                                            <input type="text" class="form-control" id="zone-icon" placeholder="📍" maxlength="2">
                                            <div class="zone-icon-suggestions" id="zone-icon-suggestions"></div>
                                        </div>
                                    </div>
                                    <div class="zone-inline-grid zone-inline-grid--pair">
                                        <div class="compact-field input-shell">
                                            <label for="zone-device" class="form-label form-label-icon">
                                                <i class="bi bi-broadcast-pin"></i>Dispositivo ESP8266
                                            </label>
                                            <div class="input-with-icon">
                                                <i class="bi bi-cpu input-leading-icon"></i>
                                                <select class="form-select" id="zone-device">
                                                    <option value="">-- Sem dispositivo --</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="compact-field input-shell">
                                            <label for="zone-risk-level" class="form-label form-label-icon">
                                                <i class="bi bi-shield-exclamation"></i>Nível de risco
                                            </label>
                                            <div class="input-with-icon">
                                                <i class="bi bi-graph-up-arrow input-leading-icon"></i>
                                                <select class="form-select" id="zone-risk-level">
                                                    <option value="1">Nível 1 • Áreas comuns</option>
                                                    <option value="2">Nível 2 • Risco moderado</option>
                                                    <option value="3">Nível 3 • Áreas críticas</option>
                                                </select>
                                            </div>
                                            <small class="text-muted">Níveis 2 e 3 marcam automaticamente como zona de risco.</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="zone-field-card zone-field-card--stack">
                                    <label for="zone-description" class="form-label"><i class="bi bi-card-text me-1"></i>Descrição</label>
                                    <textarea class="form-control" id="zone-description" rows="3" placeholder="Descreva detalhes importantes da área"></textarea>
                                </div>
                                <input type="hidden" id="zone-x" value="0.10">
                                <input type="hidden" id="zone-y" value="0.10">
                                <input type="hidden" id="zone-width" value="0.10">
                                <input type="hidden" id="zone-height" value="0.10">
                            </div>
                            <div class="zone-modal__preview">
                                <div class="zone-preview-panel">
                                    <div class="zone-preview-panel__header">
                                        <p class="zone-preview-panel__kicker">Preview em tempo real</p>
                                        <h5 class="zone-preview-panel__title">Posicionamento no mapa</h5>
                                        <p class="zone-preview-panel__subtitle">Arraste o retângulo azul para ajustar posição e use as alças para redimensionar.</p>
                                    </div>
                                        <div class="zone-preview-canvas" id="zone-modal-preview" role="presentation">
                                            <div class="zone-preview-status" id="zone-preview-status">
                                                <span class="zone-risk-pill" id="zone-risk-pill">Área segura</span>
                                            </div>
                                        <div class="zone-preview-grid"></div>
                                        <div class="zone-preview-existing" id="zone-preview-existing"></div>
                                        <div class="zone-preview-shape" id="zone-modal-preview-shape">
                                                <div class="zone-preview-label" id="zone-preview-label"></div>
                                            <span class="zone-preview-handle handle-nw" data-handle="nw"></span>
                                            <span class="zone-preview-handle handle-ne" data-handle="ne"></span>
                                            <span class="zone-preview-handle handle-sw" data-handle="sw"></span>
                                            <span class="zone-preview-handle handle-se" data-handle="se"></span>
                                        </div>
                                    </div>
                                    <div class="zone-preview-meta" aria-live="polite">
                                        <div class="zone-preview-meta__item">
                                            <span>Posição</span>
                                            <strong id="zone-preview-position">(0.10, 0.10)</strong>
                                        </div>
                                        <div class="zone-preview-meta__item">
                                            <span>Tamanho</span>
                                            <strong id="zone-preview-size">0.10 × 0.10</strong>
                                        </div>
                                        <div class="zone-preview-meta__item">
                                            <span>Cor</span>
                                            <strong id="zone-preview-color">#2563EB</strong>
                                        </div>
                                    </div>
                                    <div class="zone-preview-actions">
                                        <button type="button" class="btn btn-outline-secondary" id="zone-modal-cancel">
                                            <i class="bi bi-arrow-left me-1"></i>Cancelar
                                        </button>
                                        <button type="submit" class="btn btn-primary" id="zone-modal-submit">
                                            <i class="bi bi-check-lg me-1"></i>Salvar área
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div class="confirm-modal" id="confirm-modal" aria-hidden="true">
                <div class="confirm-modal__dialog">
                    <button type="button" class="confirm-modal__close" id="confirm-modal-close" aria-label="Fechar confirmação">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="confirm-modal__icon" id="confirm-modal-icon">
                        <i class="bi bi-exclamation-octagon"></i>
                    </div>
                    <p class="confirm-modal__kicker" id="confirm-modal-kicker">Confirmação</p>
                    <h4 class="confirm-modal__title" id="confirm-modal-title">Confirmar ação</h4>
                    <p class="confirm-modal__message" id="confirm-modal-message">Deseja prosseguir com esta ação?</p>
                    <div class="confirm-modal__actions">
                        <button class="btn btn-outline-secondary confirm-modal__cancel" id="confirm-modal-cancel">Cancelar</button>
                        <button class="btn confirm-modal__confirm" id="confirm-modal-confirm">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function clamp(value, min = 0, max = 1){
        const num = Number(value);
        if (Number.isNaN(num)) return min;
        return Math.min(max, Math.max(min, num));
    }

    function normalizeCoordLocal(v) {
        if (v === undefined || v === null) return v;
        const n = Number(parseFloat(v));
        if (Number.isNaN(n)) return 0;
        const clamped = Math.min(1, Math.max(0, n));
        return Number(clamped.toFixed(2));
    }

    function parseLocaleNumber(s) {
        if (s === undefined || s === null) return NaN;
        if (typeof s === 'number') return s;
        const str = String(s).trim().replace(',', '.');
        const n = parseFloat(str);
        return Number.isNaN(n) ? NaN : n;
    }

    function normalizeRiskLevel(value){
        if (value === undefined || value === null || value === '') return '1';
        const raw = String(value).trim();
        if (['1', '2', '3'].includes(raw)) {
            return raw;
        }
        const lowered = raw.toLowerCase();
        if (['1', '2', '3'].includes(lowered)) {
            return lowered;
        }
        return LEGACY_RISK_LEVEL_MAP[lowered] || '1';
    }

    function isZoneRisky(zone){
        if (!zone) return false;
        const normalized = normalizeRiskLevel(zone.riskLevel);
        return Boolean(zone.isRiskZone) || normalized === '2' || normalized === '3';
    }

    function mapRiskLevelForApi(value){
        const normalized = normalizeRiskLevel(value);
        if (normalized === '1') return 'none';
        if (normalized === '2') return 'medium';
        return 'critical';
    }

    function slugify(value = ''){
            return value
                .normalize('NFD').replace(/[\u0000-\u001F]/g, '')
                .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40);
    }

    function generateZoneIdFromName(name = ''){
        const baseSlug = slugify(name);
        if (!baseSlug) return '';
        const siblings = zonesCache.filter(zone => {
            const zoneId = (zone && zone.id) ? String(zone.id).toLowerCase() : '';
            return zoneId.startsWith(baseSlug);
        }).length;
        const suffix = String(siblings + 1).padStart(2, '0');
        return `${baseSlug}_${suffix}`;
    }

    function generateFallbackZoneId(){
        return `zona_${Date.now().toString(36)}`;
    }

    function setZoneIdValue(value){
        const idInput = document.getElementById('zone-id');
        if (idInput) {
            idInput.value = value;
        }
    }

    function bindAutoIdBehavior(){
        const nameInput = document.getElementById('zone-name');
        const idInput = document.getElementById('zone-id');
        if (!nameInput || !idInput) return;
        if (nameInput.dataset.autoIdBound === 'true') return;
        nameInput.dataset.autoIdBound = 'true';
        nameInput.addEventListener('input', (event) => {
            if (editingZoneId) return;
            const generated = generateZoneIdFromName(event.target.value || '');
            setZoneIdValue(generated);
        });
    }

    function setupIconSuggestions(){
        const container = document.getElementById('zone-icon-suggestions');
        const input = document.getElementById('zone-icon');
        if (!container || !input) return;
        if (container.dataset.bound === 'true') return;
        container.dataset.bound = 'true';
        container.innerHTML = ICON_SUGGESTIONS.map(icon => `<button type="button" class="icon-suggestion" data-icon="${icon}">${icon}</button>`).join('');
        container.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-icon]');
            if (!button) return;
            input.value = button.dataset.icon;
            input.focus();
        });
        // highlight suggestion row on focus to mimic picker opening
        input.addEventListener('focus', () => {
            container.classList.add('is-open');
            const firstSuggestion = container.querySelector('button[data-icon]');
            if (firstSuggestion) {
                firstSuggestion.focus();
            }
        });
        input.addEventListener('blur', () => {
            container.classList.remove('is-open');
        });
        container.addEventListener('mousedown', (e) => e.preventDefault());
    }

    function setupColorPalette(){
        const palette = document.getElementById('zone-color-palette');
        const colorInput = document.getElementById('zone-color');
        if (!palette || !colorInput) return;
        if (palette.dataset.bound === 'true') return;
        palette.dataset.bound = 'true';
        palette.innerHTML = COLOR_PRESETS.map(color => `<button type="button" class="color-chip" data-color="${color}" style="--chip-color:${color}"></button>`).join('');
        palette.addEventListener('click', (event) => {
            const chip = event.target.closest('button[data-color]');
            if (!chip) return;
            const value = chip.dataset.color;
            colorInput.value = value;
            colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            colorInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function setupPreviewInteractions(){
        const canvas = document.getElementById('zone-modal-preview');
        const shape = document.getElementById('zone-modal-preview-shape');
        if (!canvas || !shape) return;
        if (shape.dataset.dragBound !== 'true') {
            shape.dataset.dragBound = 'true';
            shape.addEventListener('pointerdown', (event) => {
                if (event.target.closest('.zone-preview-handle')) return;
                startPreviewDrag(event, canvas, shape);
            });
        }
        document.querySelectorAll('.zone-preview-handle').forEach(handle => {
            if (handle.dataset.resizeBound === 'true') return;
            handle.dataset.resizeBound = 'true';
            handle.addEventListener('pointerdown', (event) => {
                event.stopPropagation();
                startPreviewResize(event, canvas, handle.dataset.handle);
            });
        });
        if (!previewInteractionsBound) {
            window.addEventListener('pointermove', handlePreviewPointerMove);
            window.addEventListener('pointerup', finishPreviewInteraction);
            window.addEventListener('pointercancel', finishPreviewInteraction);
            previewInteractionsBound = true;
        }
    }

    function startPreviewDrag(event, canvas, shape){
        event.preventDefault();
        const values = collectZoneFormData();
        if (!values) return;
        const descriptor = getZoneDescriptor(values);
        previewInteractionState.active = true;
        previewInteractionState.mode = 'drag';
        previewInteractionState.handle = null;
        previewInteractionState.pointerId = event.pointerId;
        previewInteractionState.pointerTarget = shape;
        previewInteractionState.canvasRect = canvas.getBoundingClientRect();
        const pointerX = clamp((event.clientX - previewInteractionState.canvasRect.left) / previewInteractionState.canvasRect.width);
        const pointerY = clamp((event.clientY - previewInteractionState.canvasRect.top) / previewInteractionState.canvasRect.height);
        previewInteractionState.offset = {
            x: pointerX - descriptor.x,
            y: pointerY - descriptor.y
        };
        previewInteractionState.startValues = {
            x: descriptor.x,
            y: descriptor.y,
            width: descriptor.width,
            height: descriptor.height
        };
        shape.setPointerCapture(event.pointerId);
    }

    function startPreviewResize(event, canvas, handle){
        event.preventDefault();
        const values = collectZoneFormData();
        if (!values) return;
        const descriptor = getZoneDescriptor(values);
        previewInteractionState.active = true;
        previewInteractionState.mode = 'resize';
        previewInteractionState.handle = handle;
        previewInteractionState.pointerId = event.pointerId;
        previewInteractionState.pointerTarget = event.currentTarget;
        previewInteractionState.canvasRect = canvas.getBoundingClientRect();
        previewInteractionState.startValues = {
            left: descriptor.x,
            top: descriptor.y,
            right: descriptor.x + descriptor.width,
            bottom: descriptor.y + descriptor.height
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePreviewPointerMove(event){
        if (!previewInteractionState.active || !previewInteractionState.canvasRect) return;
        const relX = clamp((event.clientX - previewInteractionState.canvasRect.left) / previewInteractionState.canvasRect.width);
        const relY = clamp((event.clientY - previewInteractionState.canvasRect.top) / previewInteractionState.canvasRect.height);
        if (previewInteractionState.mode === 'drag') {
            const { width, height } = previewInteractionState.startValues;
            let newX = relX - previewInteractionState.offset.x;
            let newY = relY - previewInteractionState.offset.y;
            newX = clamp(newX, 0, 1 - width);
            newY = clamp(newY, 0, 1 - height);
            applyPreviewValuesFromInteraction({ x: newX, y: newY, width, height });
        } else if (previewInteractionState.mode === 'resize') {
            const { left, top, right, bottom } = previewInteractionState.startValues;
            let newLeft = left;
            let newTop = top;
            let newRight = right;
            let newBottom = bottom;
            switch (previewInteractionState.handle) {
                case 'nw':
                    newLeft = clamp(relX, 0, right - MIN_ZONE_SIZE);
                    newTop = clamp(relY, 0, bottom - MIN_ZONE_SIZE);
                    break;
                case 'ne':
                    newRight = clamp(relX, left + MIN_ZONE_SIZE, 1);
                    newTop = clamp(relY, 0, bottom - MIN_ZONE_SIZE);
                    break;
                case 'sw':
                    newLeft = clamp(relX, 0, right - MIN_ZONE_SIZE);
                    newBottom = clamp(relY, top + MIN_ZONE_SIZE, 1);
                    break;
                case 'se':
                default:
                    newRight = clamp(relX, left + MIN_ZONE_SIZE, 1);
                    newBottom = clamp(relY, top + MIN_ZONE_SIZE, 1);
                    break;
            }
            const width = Math.max(MIN_ZONE_SIZE, newRight - newLeft);
            const height = Math.max(MIN_ZONE_SIZE, newBottom - newTop);
            applyPreviewValuesFromInteraction({ x: newLeft, y: newTop, width, height });
        }
    }

    function finishPreviewInteraction(){
        if (!previewInteractionState.active) return;
        if (previewInteractionState.pointerTarget && previewInteractionState.pointerId !== null) {
            try {
                previewInteractionState.pointerTarget.releasePointerCapture(previewInteractionState.pointerId);
            } catch (err) {
                // ignore
            }
        }
        previewInteractionState.active = false;
        previewInteractionState.mode = 'idle';
        previewInteractionState.handle = null;
        previewInteractionState.pointerId = null;
        previewInteractionState.pointerTarget = null;
        previewInteractionState.canvasRect = null;
    }

    function applyPreviewValuesFromInteraction(values){
        setNumericInput('zone-x', values.x);
        setNumericInput('zone-y', values.y);
        setNumericInput('zone-width', values.width);
        setNumericInput('zone-height', values.height);
        updateZoneModalPreview();
    }

    function setNumericInput(id, value){
        const input = document.getElementById(id);
        if (!input) return;
        input.value = Number(value).toFixed(2);
    }

    function renderPreviewExistingZones(excludeId){
        const overlay = document.getElementById('zone-preview-existing');
        if (!overlay) return;
        if (!Array.isArray(zonesCache) || zonesCache.length === 0) {
            overlay.innerHTML = '';
            return;
        }
        const fragments = zonesCache
            .filter(zone => zone && zone.id !== excludeId)
            .map(zone => {
                const descriptor = getZoneDescriptor(zone);
                const label = `${zone.icon || '📍'} ${zone.name || zone.id}`;
                return `<span class="zone-preview-shadow" style="--zone-color:${descriptor.color}; --zone-x:${descriptor.x}; --zone-y:${descriptor.y}; --zone-width:${descriptor.width}; --zone-height:${descriptor.height};"><span class="zone-shadow-label">${label}</span></span>`;
            });
        overlay.innerHTML = fragments.join('');
    }

    function setFilterPanelVisibility(target, isOpen){
        const config = FILTER_CONFIG[target];
        if (!config) return;
        const panel = document.getElementById(config.panelId);
        const toggle = document.querySelector(`[data-filter-toggle="${target}"]`);
        if (panel) {
            panel.classList.toggle('is-open', isOpen);
            panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        LIST_STATE.filtersOpen = isOpen;
    }

    function toggleFilterPanel(target){
        const nextState = !LIST_STATE.filtersOpen;
        setFilterPanelVisibility(target, nextState);
    }

    async function loadDevices(){
        try {
            devicesCache = await DevicesController.getAll();
        } catch (error) {
            console.warn('Não foi possível carregar dispositivos:', error);
            devicesCache = [];
        }
    }

    async function loadZones(){
        const listNode = document.getElementById('zones-list');
        try {
            const token = getAuthToken();
            await loadDevices();
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            zonesCache = Array.isArray(result.data) ? result.data : [];
            const currentDeviceSelection = document.getElementById('zone-device')?.value || '';
            populateDeviceSelect(currentDeviceSelection);
            updateHeroStats();
            renderZonesList();
            renderPreviewExistingZones(editingZoneId);
        } catch (error) {
            console.error('Erro ao carregar áreas:', error);
            if (listNode) {
                listNode.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar áreas: ${error.message}
                    </div>
                `;
            }
        }
    }

    function populateDeviceSelect(selectedValue = ''){
        const select = document.getElementById('zone-device');
        if (!select) return;
        const options = ['<option value="">-- Sem dispositivo --</option>'];
        let hasSelectedOption = selectedValue === '';
        if (devicesCache.length === 0) {
            select.innerHTML = options.join('');
            select.value = selectedValue;
            return;
        }
        const linkedZoneIds = zonesCache
            .filter(zone => zone && zone.deviceId)
            .map(zone => String(zone.deviceId).toLowerCase());
        devicesCache.forEach(device => {
            if (!device || !device.id) return;
            const isSensor = !device.type || String(device.type).toLowerCase() === 'sensor';
            if (!isSensor && (!selectedValue || String(device.id).toLowerCase() !== String(selectedValue).toLowerCase())) return;
            const idLower = String(device.id).toLowerCase();
            const isLinkedElsewhere = linkedZoneIds.includes(idLower) && (!selectedValue || idLower !== String(selectedValue).toLowerCase());
            if (isLinkedElsewhere) return; // skip devices already linked to another zone
            const label = device.name ? `${device.id} • ${device.name}` : device.id;
            options.push(`<option value="${device.id}">${label}</option>`);
            if (selectedValue && String(device.id) === String(selectedValue)) {
                hasSelectedOption = true;
            }
        });
        if (selectedValue && !hasSelectedOption) {
            options.push(`<option value="${selectedValue}" data-recovered="true">${selectedValue} • (registro recuperado)</option>`);
        }
        select.innerHTML = options.join('');
        select.value = selectedValue;
    }

    function updateHeroStats(){
        const total = zonesCache.length;
        const risk = zonesCache.filter(zone => zone.isRiskZone).length;
        const linked = zonesCache.filter(zone => zone.deviceId).length;
        const coverage = zonesCache.reduce((acc, zone) => acc + ((zone.width || 0) * (zone.height || 0)), 0);
        setTextContent('zones-total-count', total);
        setTextContent('zones-risk-count', risk);
        setTextContent('zones-connected-count', linked);
        setTextContent('zones-coverage-percent', `${Math.min(100, Math.round(coverage * 100))}%`);
        setTextContent('zones-count', total);
    }

    function renderZonesList(){
        const container = document.getElementById('zones-list');
        if (!container) return;
        const filtered = getFilteredZones();
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-geo display-5 text-muted mb-3"></i>
                    <p class="text-muted mb-2">Nenhuma área encontrada com os filtros atuais</p>
                    <button class="btn btn-outline-primary btn-sm" data-zone-modal-trigger="create">
                        <i class="bi bi-plus-circle me-1"></i>Nova área
                    </button>
                </div>
            `;
            updatePaginationInfo(0, 1);
            bindToolbarTriggers();
            return;
        }

        const totalPages = Math.max(1, Math.ceil(filtered.length / LIST_STATE.perPage));
        LIST_STATE.page = Math.min(Math.max(1, LIST_STATE.page), totalPages);
        const startIndex = (LIST_STATE.page - 1) * LIST_STATE.perPage;
        const pageItems = filtered.slice(startIndex, startIndex + LIST_STATE.perPage);

        container.innerHTML = pageItems.map(zone => {
            const descriptor = getZoneDescriptor(zone);
            const previewVars = `--zone-color: ${descriptor.color}; --zone-x: ${descriptor.x}; --zone-y: ${descriptor.y}; --zone-width: ${descriptor.width}; --zone-height: ${descriptor.height};`;
            const riskChip = zone.isRiskZone ? `<span class="zone-chip zone-chip--risk"><i class="bi bi-shield-exclamation me-1"></i>Risco ${formatRiskLevel(zone.riskLevel)}</span>` : '<span class="zone-chip zone-chip--safe"><i class="bi bi-shield-check me-1"></i>Área segura</span>';
            const linkageChip = descriptor.hasDevice ? `<span class="zone-chip zone-chip--link ${descriptor.isOnline ? 'is-online' : 'is-offline'}"><i class="bi ${descriptor.statusIcon} me-1"></i>${descriptor.statusLabel}</span>` : '<span class="zone-chip zone-chip--link"><i class="bi bi-ban me-1"></i>Sem dispositivo</span>';
            return `
                <div class="card zone-card border-0 shadow-sm">
                    <div class="zone-card__content">
                        <div class="zone-card__preview" style="${previewVars}">
                            <div class="zone-card__preview-grid"></div>
                            <div class="zone-card__preview-shape"></div>
                        </div>
                        <div class="zone-card__details">
                            <div class="zone-card__header">
                                <div>
                                    <h6 class="mb-1">
                                        <span class="zone-card__icon">${zone.icon || '📍'}</span>
                                        ${zone.name}
                                    </h6>
                                    <p class="text-muted small mb-0">ID: ${zone.id}</p>
                                </div>
                                <div class="zone-card__chips">
                                    ${riskChip}
                                    ${linkageChip}
                                </div>
                            </div>
                            <div class="zone-card__meta">
                                <div>
                                    <span>Posição</span>
                                    <strong>${descriptor.position}</strong>
                                </div>
                                <div>
                                    <span>Tamanho</span>
                                    <strong>${descriptor.size}</strong>
                                </div>
                                <div>
                                    <span>Cor</span>
                                    <strong>${descriptor.color.toUpperCase()}</strong>
                                </div>
                                <div>
                                    <span>Dispositivo</span>
                                    <strong>${descriptor.deviceLabel}</strong>
                                </div>
                            </div>
                            ${zone.description ? `<p class="zone-card__description">${zone.description}</p>` : ''}
                        </div>
                        <div class="zone-card__actions" data-zone-id="${zone.id}">
                            <button class="btn btn-outline-primary btn-sm btn-edit-zone" title="Editar área">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm btn-delete-zone" title="Excluir área">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        updatePaginationInfo(filtered.length, totalPages);
        bindListActionButtons();
        bindToolbarTriggers();
    }

    function bindToolbarTriggers(){
        const triggers = document.querySelectorAll('[data-zone-modal-trigger]');
        triggers.forEach(trigger => {
            if (trigger.dataset.zoneModalBound === 'true') return;
            trigger.dataset.zoneModalBound = 'true';
            trigger.addEventListener('click', () => openZoneModal('create'));
        });
    }

    function bindListActionButtons(){
        document.querySelectorAll('.btn-edit-zone').forEach(button => {
            button.addEventListener('click', async (event) => {
                const zoneId = event.currentTarget.closest('.zone-card__actions').dataset.zoneId;
                await editZone(zoneId);
            });
        });
        document.querySelectorAll('.btn-delete-zone').forEach(button => {
            button.addEventListener('click', async (event) => {
                const zoneId = event.currentTarget.closest('.zone-card__actions').dataset.zoneId;
                await deleteZone(zoneId);
            });
        });
    }

    function updatePaginationInfo(filteredLength, totalPages){
        const infoNode = document.getElementById('zones-page-info');
        const prevBtn = document.getElementById('zones-prev');
        const nextBtn = document.getElementById('zones-next');
        if (infoNode) {
            if (filteredLength === 0) {
                infoNode.textContent = 'Página 0 de 0';
            } else {
                infoNode.textContent = `Página ${LIST_STATE.page} de ${totalPages}`;
            }
        }
        if (prevBtn) {
            prevBtn.disabled = filteredLength === 0 || LIST_STATE.page <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = filteredLength === 0 || LIST_STATE.page >= totalPages;
        }
    }

    function getFilteredZones(){
        const { search, risk, level, status, linkage, sort } = LIST_STATE.filters;
        const filtered = zonesCache.filter(zone => {
            const descriptor = getZoneDescriptor(zone);
            if (search) {
                const term = search.toLowerCase();
                const haystack = `${zone.name || ''} ${zone.id || ''} ${zone.description || ''}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            if (risk === 'risk' && !zone.isRiskZone) return false;
            if (risk === 'safe' && zone.isRiskZone) return false;
            if (level !== 'all') {
                const normalizedFilter = normalizeRiskLevel(level);
                const normalizedZone = normalizeRiskLevel(zone.riskLevel);
                if (normalizedZone !== normalizedFilter) return false;
            }
            if (status !== 'all' && descriptor.statusKey !== status) return false;
            if (linkage === 'linked' && !descriptor.hasDevice) return false;
            if (linkage === 'unlinked' && descriptor.hasDevice) return false;
            return true;
        });

        const normalizeRisk = (zone) => {
            const riskValue = zone.isRiskZone ? '3' : normalizeRiskLevel(zone.riskLevel || '1');
            return Number(riskValue);
        };

        filtered.sort((a, b) => {
            const descA = getZoneDescriptor(a);
            const descB = getZoneDescriptor(b);
            const nameA = (a.name || a.id || '').toLowerCase();
            const nameB = (b.name || b.id || '').toLowerCase();
            const sizeA = (a.width || 0) * (a.height || 0);
            const sizeB = (b.width || 0) * (b.height || 0);
            const riskA = normalizeRisk(a);
            const riskB = normalizeRisk(b);
            const statusWeight = (descriptor) => descriptor.statusKey === 'online' ? 2 : descriptor.hasDevice ? 1 : 0;
            switch (sort) {
                case 'name-desc':
                    return nameB.localeCompare(nameA);
                case 'risk-desc':
                    return riskB - riskA || nameA.localeCompare(nameB);
                case 'status-desc':
                    return statusWeight(descB) - statusWeight(descA) || nameA.localeCompare(nameB);
                case 'size-desc':
                    return sizeB - sizeA || nameA.localeCompare(nameB);
                case 'name-asc':
                default:
                    return nameA.localeCompare(nameB);
            }
        });

        return filtered;
    }

    function getZoneDescriptor(zone = {}){
        const color = (zone.color || '#2563eb').toLowerCase();
        const width = clamp(zone.width || 0.1);
        const height = clamp(zone.height || 0.1);
        const x = clamp(zone.x || 0.1);
        const y = clamp(zone.y || 0.1);
        const hasDevice = Boolean(zone.deviceId);
        const linkedDevice = hasDevice ? devicesCache.find(device => (device.id || '').toLowerCase() === String(zone.deviceId).toLowerCase()) : null;
        const deviceActive = linkedDevice ? linkedDevice.active !== false : true;
        const isOnline = hasDevice ? (zone.connectionStatus === 'online' && zone.currentlyActive !== false && deviceActive) : false;
        const statusKey = !hasDevice ? 'offline' : (isOnline ? 'online' : 'offline');
        const statusLabel = !hasDevice ? 'Sem dispositivo' : (isOnline ? 'Conectada' : 'Desconectada');
        const statusIcon = isOnline ? 'bi-broadcast' : (hasDevice ? 'bi-plug' : 'bi-ban');
        const deviceLabel = hasDevice ? zone.deviceId : 'Nenhum';
        return {
            color,
            width,
            height,
            x,
            y,
            hasDevice,
            isOnline,
            statusKey,
            statusLabel,
            statusIcon,
            deviceLabel,
            size: `${width.toFixed(2)} × ${height.toFixed(2)}`,
            position: `(${x.toFixed(2)}, ${y.toFixed(2)})`
        };
    }

    function formatRiskLevel(level = '1'){
        const normalized = normalizeRiskLevel(level);
        return RISK_LEVEL_LABELS[normalized] || RISK_LEVEL_LABELS['1'];
    }

    function registerFilterEvents(){
        const searchInput = document.getElementById('zones-search');
        const riskSelect = document.getElementById('zones-risk-filter');
        const statusSelect = document.getElementById('zones-status-filter');
        const linkageSelect = document.getElementById('zones-linkage-filter');
        const levelSelect = document.getElementById('zones-level-filter');
        const sortSelect = document.getElementById('zones-sort');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                LIST_STATE.filters.search = event.target.value.trim();
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
        if (riskSelect) {
            riskSelect.addEventListener('change', (event) => {
                LIST_STATE.filters.risk = event.target.value;
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
        if (statusSelect) {
            statusSelect.addEventListener('change', (event) => {
                LIST_STATE.filters.status = event.target.value;
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
        if (linkageSelect) {
            linkageSelect.addEventListener('change', (event) => {
                LIST_STATE.filters.linkage = event.target.value;
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
        if (levelSelect) {
            levelSelect.addEventListener('change', (event) => {
                LIST_STATE.filters.level = event.target.value;
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
        if (sortSelect) {
            sortSelect.value = LIST_STATE.filters.sort;
            sortSelect.addEventListener('change', (event) => {
                LIST_STATE.filters.sort = event.target.value;
                LIST_STATE.page = 1;
                renderZonesList();
            });
        }
    }

    function registerPaginationEvents(){
        const prevBtn = document.getElementById('zones-prev');
        const nextBtn = document.getElementById('zones-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (LIST_STATE.page > 1) {
                    LIST_STATE.page -= 1;
                    renderZonesList();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                LIST_STATE.page += 1;
                renderZonesList();
            });
        }
    }

    function registerToolbarButtons(){
        const filterToggle = document.querySelector('[data-filter-toggle="zones"]');
        const refreshBtn = document.getElementById('zones-refresh-btn');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => toggleFilterPanel('zones'));
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadZones());
        }
    }

    function bindModalEvents(){
        const modal = document.getElementById('zone-modal');
        if (!modal) return;
        const closeBtn = document.getElementById('zone-modal-close');
        const cancelBtn = document.getElementById('zone-modal-cancel');
        const form = document.getElementById('zone-form');
        const previewInputs = ['zone-x', 'zone-y', 'zone-width', 'zone-height', 'zone-color', 'zone-risk-level'];
        previewInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', updateZoneModalPreview);
                input.addEventListener('change', updateZoneModalPreview);
            }
        });
        if (closeBtn) {
            closeBtn.addEventListener('click', closeZoneModal);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeZoneModal);
        }
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeZoneModal();
            }
        });
        if (form) {
            form.addEventListener('submit', handleZoneSubmit);
        }
        bindAutoIdBehavior();
        setupIconSuggestions();
        setupColorPalette();
        setupPreviewInteractions();
    }

    function openZoneModal(mode = 'create', zone = null){
        stopAutoRefresh();
        const modal = document.getElementById('zone-modal');
        if (!modal) return;
        const title = document.getElementById('zone-modal-title');
        const kicker = document.getElementById('zone-modal-kicker');
        const badge = document.getElementById('zone-modal-mode-label');
        const submitBtn = document.getElementById('zone-modal-submit');
        editingZoneId = zone ? zone.id : null;
        populateDeviceSelect(zone && zone.deviceId ? zone.deviceId : '');
        if (zone) {
            populateZoneForm(zone);
        } else {
            resetZoneForm();
        }
        setupIconSuggestions();
        setupColorPalette();
        updateZoneModalPreview();
        renderPreviewExistingZones(zone ? zone.id : null);
        if (mode === 'edit') {
            title.textContent = 'Editar área cadastrada';
            kicker.textContent = 'Atualização de zona';
            badge.textContent = 'Edição';
            if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Atualizar área';
        } else {
            title.textContent = 'Cadastrar nova zona';
            kicker.textContent = 'Nova área';
            badge.textContent = 'Criação';
            if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar área';
        }
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('zone-modal-open');
        requestAnimationFrame(() => {
            modal.classList.add('is-visible');
        });
    }

    function closeZoneModal(){
        const modal = document.getElementById('zone-modal');
        if (!modal) return;
        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('zone-modal-open');
        editingZoneId = null;
        startAutoRefresh();
    }

    function populateZoneForm(zone){
        document.getElementById('zone-edit-id').value = zone.id || '';
        setZoneIdValue(zone.id || '');
        document.getElementById('zone-name').value = zone.name || '';
        document.getElementById('zone-x').value = (zone.x ?? 0.1).toFixed(2);
        document.getElementById('zone-y').value = (zone.y ?? 0.1).toFixed(2);
        document.getElementById('zone-width').value = (zone.width ?? 0.1).toFixed(2);
        document.getElementById('zone-height').value = (zone.height ?? 0.1).toFixed(2);
        document.getElementById('zone-color').value = zone.color || '#2563eb';
        document.getElementById('zone-icon').value = zone.icon || '';
        document.getElementById('zone-device').value = zone.deviceId || '';
        document.getElementById('zone-risk-level').value = normalizeRiskLevel(zone.riskLevel);
        document.getElementById('zone-description').value = zone.description || '';
    }

    function resetZoneForm(){
        const form = document.getElementById('zone-form');
        if (form) {
            form.reset();
        }
        document.getElementById('zone-edit-id').value = '';
        setZoneIdValue(generateFallbackZoneId());
        document.getElementById('zone-color').value = '#2563eb';
        document.getElementById('zone-risk-level').value = '1';
    }

    async function handleZoneSubmit(event){
        event.preventDefault();
        const formData = collectZoneFormData();
        if (!formData) return;
        try {
            const wasEditing = Boolean(editingZoneId);
            await saveZone(formData);
            closeZoneModal();
            showToast(`Área ${wasEditing ? 'atualizada' : 'criada'} com sucesso!`, 'success');
            await loadZones();
        } catch (error) {
            console.error('Erro ao salvar área:', error);
            showToast(error.message || 'Erro ao salvar área', 'danger');
        }
    }

    function collectZoneFormData(){
        const idInput = document.getElementById('zone-id');
        const nameInput = document.getElementById('zone-name');
        const colorInput = document.getElementById('zone-color');
        if (!idInput || !nameInput) return null;
        let zoneId = (idInput.value || '').trim();
        if (!zoneId) {
            const autoFromName = generateZoneIdFromName(nameInput.value || '');
            zoneId = autoFromName || generateFallbackZoneId();
            setZoneIdValue(zoneId);
        }
        const rawX = parseLocaleNumber(document.getElementById('zone-x').value);
        const rawY = parseLocaleNumber(document.getElementById('zone-y').value);
        const rawW = parseLocaleNumber(document.getElementById('zone-width').value);
        const rawH = parseLocaleNumber(document.getElementById('zone-height').value);
        const width = Number(Math.min(0.5, Math.max(MIN_ZONE_SIZE, rawW)).toFixed(2));
        const height = Number(Math.min(0.5, Math.max(MIN_ZONE_SIZE, rawH)).toFixed(2));
        const selectedRiskLevel = document.getElementById('zone-risk-level').value;
        const normalizedRiskLevel = normalizeRiskLevel(selectedRiskLevel);
        const isRiskZone = normalizedRiskLevel !== '1';
        return {
            id: zoneId,
            name: nameInput.value,
            x: normalizeCoordLocal(rawX),
            y: normalizeCoordLocal(rawY),
            width,
            height,
            color: colorInput.value,
            icon: document.getElementById('zone-icon').value || '📍',
            deviceId: document.getElementById('zone-device').value || null,
            isRiskZone,
            riskLevel: mapRiskLevelForApi(normalizedRiskLevel),
            description: document.getElementById('zone-description').value
        };
    }

    async function saveZone(formData){
        const token = getAuthToken();
        const editId = editingZoneId || document.getElementById('zone-edit-id').value;
        const isEdit = Boolean(editId);
        const url = isEdit ? `${API_URL}/${editId}` : API_URL;
        const method = isEdit ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        if (!response.ok) {
            const message = await parseErrorResponse(response);
            throw new Error(message);
        }
        await response.json().catch(() => ({}));
    }

    async function parseErrorResponse(response){
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
            const payload = await response.json().catch(() => ({}));
            return payload.message || payload.error || `Erro HTTP ${response.status}`;
        }
        const text = await response.text().catch(() => '');
        return text || `Erro HTTP ${response.status}`;
    }

    async function editZone(zoneId){
        if (!zoneId) return;
        let zone = zonesCache.find(item => item.id === zoneId);
        if (!zone) {
            zone = await fetchZoneById(zoneId);
        }
        if (!zone) {
            showToast('Área não encontrada', 'warning');
            return;
        }
        openZoneModal('edit', zone);
    }

    async function fetchZoneById(zoneId){
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/${zoneId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Área não encontrada');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar área:', error);
            return null;
        }
    }

    async function deleteZone(zoneId){
        const zone = zonesCache.find(item => item.id === zoneId);
        const zoneName = zone ? zone.name : zoneId;
        const accepted = await showConfirmModal({
            title: 'Remover área',
            message: `Tem certeza que deseja remover "${zoneName}"?`,
            confirmLabel: 'Remover',
            variant: 'danger',
            icon: 'bi-trash'
        });
        if (!accepted) return;
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/${zoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao deletar área');
            await response.json();
            showToast('Área deletada com sucesso', 'success');
            await loadZones();
        } catch (error) {
            console.error('Erro ao deletar área:', error);
            showToast(error.message || 'Erro ao deletar área', 'danger');
        }
    }

    function updateZoneModalPreview(){
        const previewCanvas = document.getElementById('zone-modal-preview');
        const previewShape = document.getElementById('zone-modal-preview-shape');
        if (!previewCanvas || !previewShape) return;
        const values = collectZoneFormData();
        if (!values) return;
        const descriptor = getZoneDescriptor(values);
        const risky = isZoneRisky(values);
        previewCanvas.style.setProperty('--zone-color', descriptor.color);
        previewCanvas.style.setProperty('--zone-x', descriptor.x);
        previewCanvas.style.setProperty('--zone-y', descriptor.y);
        previewCanvas.style.setProperty('--zone-width', descriptor.width);
        previewCanvas.style.setProperty('--zone-height', descriptor.height);
        previewShape.style.setProperty('--zone-color', descriptor.color);
        setTextContent('zone-preview-position', descriptor.position);
        setTextContent('zone-preview-size', descriptor.size);
        setTextContent('zone-preview-color', descriptor.color.toUpperCase());
        const pill = document.getElementById('zone-risk-pill');
        if (pill) {
            pill.textContent = risky ? 'Zona de risco' : 'Área segura';
            pill.classList.toggle('is-risk', risky);
        }
        const labelNode = document.getElementById('zone-preview-label');
        if (labelNode) {
            const labelText = `${values.icon || '📍'} ${values.name || values.id}`;
            labelNode.textContent = labelText;
        }
    }

    function setTextContent(id, value){
        const node = document.getElementById(id);
        if (node) {
            node.textContent = value;
        }
    }

    function showToast(message, type = 'info'){
        const icons = {
            success: 'bi-check2-circle',
            danger: 'bi-exclamation-triangle',
            warning: 'bi-exclamation-circle',
            info: 'bi-info-circle'
        };
        let stack = document.getElementById('toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'toast-stack';
            stack.className = 'toast-stack';
            document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-icon"><i class="bi ${icons[type] || icons.info}"></i></div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" aria-label="Fechar notificação"><i class="bi bi-x"></i></button>
        `;
        stack.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });
        const close = () => {
            toast.classList.remove('is-visible');
            toast.classList.add('is-hiding');
            setTimeout(() => {
                toast.remove();
                if (!stack.hasChildNodes()) {
                    stack.remove();
                }
            }, 250);
        };
        const timer = setTimeout(close, 4000);
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timer);
            close();
        });
    }

    function showConfirmModal(options = {}) {
        const modal = document.getElementById('confirm-modal');
        if (!modal) return Promise.resolve(false);
        const {
            title = 'Confirmar ação',
            message = 'Deseja prosseguir com esta operação?',
            confirmLabel = 'Confirmar',
            cancelLabel = 'Cancelar',
            variant = 'danger',
            kicker = 'Confirmação necessária',
            icon = variant === 'warning' ? 'bi-exclamation-triangle' : variant === 'success' ? 'bi-check-circle' : 'bi-exclamation-octagon'
        } = options;
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        document.getElementById('confirm-modal-kicker').textContent = kicker;
        document.getElementById('confirm-modal-icon').innerHTML = `<i class="bi ${icon}"></i>`;
        document.getElementById('confirm-modal-confirm').textContent = confirmLabel;
        document.getElementById('confirm-modal-cancel').textContent = cancelLabel;
        modal.classList.remove('confirm-modal--danger', 'confirm-modal--warning', 'confirm-modal--success', 'confirm-modal--info');
        modal.classList.add(`confirm-modal--${variant}`);
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('confirm-modal-open');
        requestAnimationFrame(() => {
            modal.classList.add('is-visible');
        });
        return new Promise(resolve => {
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            const confirmBtn = document.getElementById('confirm-modal-confirm');
            const closeBtn = document.getElementById('confirm-modal-close');
            const cleanup = () => {
                modal.classList.remove('is-visible');
                modal.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('confirm-modal-open');
                modal.removeEventListener('click', onOverlayClick);
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                if (closeBtn) closeBtn.removeEventListener('click', onCancel);
            };
            const onConfirm = () => {
                cleanup();
                resolve(true);
            };
            const onCancel = () => {
                cleanup();
                resolve(false);
            };
            const onOverlayClick = (event) => {
                if (event.target === modal) {
                    onCancel();
                }
            };
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            if (closeBtn) closeBtn.addEventListener('click', onCancel);
            modal.addEventListener('click', onOverlayClick);
        });
    }

    function stopAutoRefresh(){
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    function startAutoRefresh(){
        stopAutoRefresh();
        refreshInterval = setInterval(() => {
            loadZones();
        }, 3000);
    }

    async function render(){
        const root = document.getElementById('view-root');
        if (!root) return;
        root.innerHTML = template();
        LIST_STATE.page = 1;
        LIST_STATE.filters = { search: '', risk: 'all', level: 'all', status: 'all', linkage: 'all', sort: 'name-asc' };
        LIST_STATE.filtersOpen = false;
        setFilterPanelVisibility('zones', false);
        registerFilterEvents();
        registerPaginationEvents();
        registerToolbarButtons();
        bindModalEvents();
        bindToolbarTriggers();
        await loadZones();
        startAutoRefresh();
    }

    function cleanup(){
        stopAutoRefresh();
    }

    return {
        render,
        cleanup,
        editZone,
        deleteZone
    };
})();
