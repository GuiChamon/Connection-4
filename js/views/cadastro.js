// js/views/cadastro.js - VERSÃO FINAL CORRIGIDA
const CombinedView = (function(){
    const root = document.getElementById('view-root');
    let refreshInterval = null; // Controla o intervalo de atualização automática
    let editingPersonId = null;
    let editingDeviceId = null;

    const LIST_STATE = {
        people: {
            search: '',
            level: 'all',
            sort: 'name-asc',
            page: 1,
            perPage: 4,
            filtersOpen: false
        },
        devices: {
            search: '',
            type: 'all',
            status: 'all',
            sort: 'status-desc',
            page: 1,
            perPage: 4,
            filtersOpen: false
        }
    };

    const FILTER_CONFIG = {
        people: { panelId: 'people-filter-panel' },
        devices: { panelId: 'devices-filter-panel' }
    };

    function getAuthToken(){
        if (typeof AuthModel !== 'undefined' && AuthModel.getToken) {
            return AuthModel.getToken();
        }
        return localStorage.getItem('connection4_token') || localStorage.getItem('token');
    }

    const ACCESS_LEVEL_DETAILS = {
        1: {
            label: 'Nível 1 • Áreas comuns',
            className: 'badge badge-access badge-level-1'
        },
        2: {
            label: 'Nível 2 • Áreas de risco moderado',
            className: 'badge badge-access badge-level-2'
        },
        3: {
            label: 'Nível 3 • Todas as áreas',
            className: 'badge badge-access badge-level-3'
        }
    };

    const ROLE_OPTIONS = [
        'Engenheiro Civil',
        'Engenheiro de Segurança',
        'Mestre de Obras',
        'Técnico de Segurança',
        'Eletricista',
        'Operador de Máquina',
        'Pedreiro',
        'Servente',
        'Visitante',
        'Supervisor'
    ];

    function getAccessLevelBadge(level){
        const normalized = Number(level) || 1;
        return ACCESS_LEVEL_DETAILS[normalized] || ACCESS_LEVEL_DETAILS[1];
    }

    function setManualEntryTab(target = 'person'){
        const tabs = document.querySelectorAll('.manual-entry-tab');
        const forms = document.querySelectorAll('.manual-entry-form');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.target === target);
        });
        forms.forEach(form => {
            form.classList.toggle('active', form.dataset.form === target);
        });
    }

    function setFilterPanelVisibility(target, isOpen){
        if (!LIST_STATE[target]) return;
        const config = FILTER_CONFIG[target];
        const panel = config ? document.getElementById(config.panelId) : null;
        const toggle = document.querySelector(`[data-filter-toggle="${target}"]`);
        if (panel) {
            panel.classList.toggle('is-open', isOpen);
            panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
        if (toggle) {
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        LIST_STATE[target].filtersOpen = isOpen;
    }

    function toggleFilterPanel(target){
        if (!LIST_STATE[target]) return;
        const nextState = !LIST_STATE[target].filtersOpen;
        // Close other panels when opening a new one
        Object.keys(FILTER_CONFIG).forEach(key => {
            setFilterPanelVisibility(key, key === target && nextState);
        });
    }

    function setRoleFieldValue(roleValue = ''){
        const roleSelect = document.getElementById('person-role');
        const customWrapper = document.getElementById('person-role-custom-wrapper');
        const customInput = document.getElementById('person-role-custom');
        if (!roleSelect) return;

        if (!roleValue) {
            roleSelect.value = '';
            if (customWrapper) customWrapper.classList.add('d-none');
            if (customInput) customInput.value = '';
            return;
        }

        const normalizedValue = roleValue.trim();
        const matchedOption = ROLE_OPTIONS.find(option => option.toLowerCase() === normalizedValue.toLowerCase());

        if (matchedOption) {
            roleSelect.value = matchedOption;
            if (customWrapper) customWrapper.classList.add('d-none');
            if (customInput) customInput.value = '';
        } else {
            roleSelect.value = 'custom';
            if (customWrapper) customWrapper.classList.remove('d-none');
            if (customInput) customInput.value = normalizedValue;
        }
    }

    function getRoleFieldValue(){
        const roleSelect = document.getElementById('person-role');
        const customInput = document.getElementById('person-role-custom');
        if (!roleSelect) return '';
        const value = roleSelect.value;
        if (value === 'custom') {
            return customInput ? customInput.value.trim() : '';
        }
        return value.trim();
    }

    function handleRoleSelectChange(){
        const roleSelect = document.getElementById('person-role');
        const customWrapper = document.getElementById('person-role-custom-wrapper');
        const customInput = document.getElementById('person-role-custom');
        if (!roleSelect || !customWrapper) return;
        if (roleSelect.value === 'custom') {
            customWrapper.classList.remove('d-none');
            if (customInput) {
                customInput.focus();
            }
        } else {
            customWrapper.classList.add('d-none');
            if (customInput) {
                customInput.value = '';
            }
        }
    }

    function openManualEntryPanel(target = 'person', options = {}){
        const { editingMode = false, title: customTitle, kicker: customKicker } = options;
        const panel = document.getElementById('manual-entry-panel');
        if (!panel) return;
        panel.classList.add('is-visible');
        panel.classList.toggle('manual-entry-editing', editingMode);
        panel.dataset.editing = editingMode ? 'true' : 'false';
        panel.dataset.editTarget = editingMode ? target : '';
        panel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('manual-entry-open');

        const kickerNode = panel.querySelector('.manual-entry-panel__kicker');
        const titleNode = panel.querySelector('#manual-entry-panel-title');
        if (kickerNode) {
            kickerNode.textContent = customKicker || (editingMode ? 'Editar colaborador' : 'Cadastro manual');
        }
        if (titleNode) {
            titleNode.textContent = customTitle || (editingMode ? 'Atualize os dados do colaborador' : 'Adicionar colaborador ou dispositivo');
        }
        setManualEntryTab(target);
    }

    function closeManualEntryPanel(){
        const panel = document.getElementById('manual-entry-panel');
        if (!panel) return;
        resetPersonForm();
        resetDeviceForm();
        const deviceForm = document.getElementById('device-form');
        if (deviceForm) {
            deviceForm.reset();
        }
        const linkForm = document.getElementById('link-form');
        if (linkForm) {
            linkForm.reset();
        }
        panel.classList.remove('is-visible');
        panel.classList.remove('manual-entry-editing');
        panel.dataset.editing = 'false';
        panel.dataset.editTarget = '';
        const kickerNode = panel.querySelector('.manual-entry-panel__kicker');
        const titleNode = panel.querySelector('#manual-entry-panel-title');
        if (kickerNode) {
            kickerNode.textContent = 'Cadastro manual';
        }
        if (titleNode) {
            titleNode.textContent = 'Adicionar colaborador ou dispositivo';
        }
        panel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('manual-entry-open');
    }

    function template(){
        return `
        <div class="col-12 hr-dashboard">
            <div class="hr-hero card border-0 shadow-sm mb-4">
                <div class="hr-hero__body">
                    <div class="hr-hero__main">
                        <span class="hero-chip">Operação integrada</span>
                        <h2 class="hr-hero__title">Gestão de colaboradores e dispositivos</h2>
                        <div class="hr-hero__stats">
                            <div class="hero-stat">
                                <div class="hero-stat__header">
                                    <span class="hero-stat__label">Colaboradores</span>
                                    <span class="hero-stat__meta">Todos os níveis</span>
                                </div>
                                <span class="hero-stat__value" id="people-count">0</span>
                            </div>
                            <div class="hero-stat">
                                <div class="hero-stat__header">
                                    <span class="hero-stat__label">Dispositivos</span>
                                    <span class="hero-stat__meta">Ativos: <strong id="devices-active-count">0</strong></span>
                                </div>
                                <span class="hero-stat__value" id="devices-count">0</span>
                            </div>
                           
                        </div>
                    </div>
                    <div class="hr-hero__actions">
                        <div class="card border-0 shadow-sm hero-card manual-entry-card">
                            <div class="card-body d-flex flex-column">
                                <span class="manual-entry-kicker">Cadastro manual</span>
                                <h5 class="card-title text-white">Adicionar novos registros</h5>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-light text-primary fw-semibold" data-manual-entry-target="person">
                                        <i class="bi bi-person-plus me-1"></i>Adicionar colaborador
                                    </button>
                                    <button class="btn btn-outline-light" data-manual-entry-target="device">
                                        <i class="bi bi-tablet me-1"></i>Adicionar dispositivo
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card border-0 shadow-sm hero-card link-cta-card">
                            <div class="card-body d-flex flex-column">
                                <span class="manual-entry-kicker text-primary">Vinculação expressa</span>
                                <h5 class="card-title mb-2">Associe dispositivos em poucos cliques</h5>
                                <div class="link-cta-metrics">
                                    <span class="metric-label">Disponíveis agora</span>
                                    <span class="metric-value" id="linkable-counter">0</span>
                                </div>
                                <button class="btn btn-primary mt-3" data-manual-entry-target="link">
                                    <i class="bi bi-link-45deg me-1"></i>Vincular manualmente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Listas de Dados -->
            <div class="row g-4 data-lists">
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header card-header--toolbar">
                            <div>
                                <h5 class="card-title mb-0 text-white d-flex flex-column">
                                    <span><i class="bi bi-people-fill me-2"></i>Colaboradores Cadastrados</span>
                                    <small class="card-subtitle text-white-50">Visualize rapidamente níveis, dispositivos e ações</small>
                                </h5>
                            </div>
                            <div class="card-toolbar card-toolbar--compact">
                                <button class="btn btn-outline-light btn-filter" data-filter-toggle="people" aria-expanded="false">
                                    <i class="bi bi-funnel me-1"></i>Filtros
                                </button>
                                <div class="card-toolbar__pagination">
                                    <button class="btn btn-outline-light btn-icon" id="people-prev" aria-label="Página anterior">
                                        <i class="bi bi-chevron-left"></i>
                                    </button>
                                    <span class="pagination-label" id="people-page-info">Página 1 de 1</span>
                                    <button class="btn btn-outline-light btn-icon" id="people-next" aria-label="Próxima página">
                                        <i class="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-filter-panel" id="people-filter-panel" aria-hidden="true">
                            <div class="card-filter-panel__content">
                                <div class="filter-field">
                                    <label class="filter-label" for="people-search">Buscar colaborador</label>
                                    <div class="toolbar-input input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control input-with-icon" id="people-search" placeholder="Nome, função ou ID">
                                    </div>
                                </div>
                                <div class="filter-field">
                                    <label class="filter-label" for="people-level-filter">Nível de acesso</label>
                                    <select class="form-select" id="people-level-filter">
                                        <option value="all">Todos os níveis</option>
                                        <option value="1">Nível 1</option>
                                        <option value="2">Nível 2</option>
                                        <option value="3">Nível 3</option>
                                    </select>
                                </div>
                                <div class="filter-field">
                                    <label class="filter-label" for="people-sort">Ordenar por</label>
                                    <select class="form-select" id="people-sort">
                                        <option value="name-asc">Nome (A → Z)</option>
                                        <option value="name-desc">Nome (Z → A)</option>
                                        <option value="level-desc">Nível de acesso (maior primeiro)</option>
                                        <option value="level-asc">Nível de acesso (menor primeiro)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="people-list">
                                <!-- Lista será preenchida dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header card-header--toolbar">
                            <div>
                                <h5 class="card-title mb-0 text-white d-flex flex-column">
                                    <span><i class="bi bi-tablet-fill me-2"></i>Dispositivos Cadastrados</span>
                                    <small class="card-subtitle text-white-50">Status em tempo real e vinculações ativas</small>
                                </h5>
                            </div>
                            <div class="card-toolbar card-toolbar--compact">
                                <button class="btn btn-outline-light btn-filter" data-filter-toggle="devices" aria-expanded="false">
                                    <i class="bi bi-funnel me-1"></i>Filtros
                                </button>
                                <div class="card-toolbar__pagination">
                                    <button class="btn btn-outline-light btn-icon" id="devices-prev" aria-label="Página anterior">
                                        <i class="bi bi-chevron-left"></i>
                                    </button>
                                    <span class="pagination-label" id="devices-page-info">Página 1 de 1</span>
                                    <button class="btn btn-outline-light btn-icon" id="devices-next" aria-label="Próxima página">
                                        <i class="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-filter-panel" id="devices-filter-panel" aria-hidden="true">
                            <div class="card-filter-panel__content">
                                <div class="filter-field">
                                    <label class="filter-label" for="devices-search">Buscar dispositivo</label>
                                    <div class="toolbar-input input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-search"></i></span>
                                        <input type="text" class="form-control input-with-icon" id="devices-search" placeholder="ID, colaborador ou zona">
                                    </div>
                                </div>
                                <div class="filter-field">
                                    <label class="filter-label" for="devices-type-filter">Tipo de dispositivo</label>
                                    <select class="form-select" id="devices-type-filter">
                                        <option value="all">Todos os tipos</option>
                                        <option value="worker">Colaboradores</option>
                                        <option value="sensor">Sensores</option>
                                    </select>
                                </div>
                                <div class="filter-field">
                                    <label class="filter-label" for="devices-status-filter">Status atual</label>
                                    <select class="form-select" id="devices-status-filter">
                                        <option value="all">Todos os status</option>
                                        <option value="online">Online</option>
                                        <option value="offline">Offline</option>
                                        <option value="inactive">Desativado</option>
                                    </select>
                                </div>
                                <div class="filter-field">
                                    <label class="filter-label" for="devices-sort">Ordenar por</label>
                                    <select class="form-select" id="devices-sort">
                                        <option value="status-desc">Status (ativos primeiro)</option>
                                        <option value="status-asc">Status (inativos primeiro)</option>
                                        <option value="id-asc">ID (A → Z)</option>
                                        <option value="id-desc">ID (Z → A)</option>
                                        <option value="type">Tipo (colaborador → sensor)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="devices-list">
                                <!-- Lista será preenchida dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="manual-entry-panel" id="manual-entry-panel" aria-hidden="true">
                <div class="manual-entry-panel__content">
                    <div class="manual-entry-panel__header">
                        <div>
                            <p class="text-muted text-uppercase small mb-1 manual-entry-panel__kicker">Cadastro manual</p>
                            <h4 class="mb-0" id="manual-entry-panel-title">Adicionar colaborador ou dispositivo</h4>
                        </div>
                        <button type="button" class="manual-entry-close" id="close-manual-entry" aria-label="Fechar painel">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="manual-entry-tabs">
                        <button class="manual-entry-tab active" data-target="person">Colaboradores</button>
                        <button class="manual-entry-tab" data-target="device">Dispositivos</button>
                        <button class="manual-entry-tab" data-target="link">Vinculação</button>
                    </div>
                    <div class="manual-entry-forms">
                        <div class="manual-entry-form active" data-form="person">
                            <form id="person-form">
                                <div class="mb-3 form-field-icon">
                                    <label for="person-name" class="form-label form-label-icon">
                                        <i class="bi bi-person-badge me-2"></i>
                                        Nome Completo *
                                    </label>
                                    <div class="input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-person"></i></span>
                                        <input type="text" class="form-control input-with-icon" id="person-name" placeholder="Digite o nome completo" required>
                                    </div>
                                </div>
                                <div class="mb-3 form-field-icon">
                                    <label for="person-role" class="form-label form-label-icon">
                                        <i class="bi bi-person-gear me-2"></i>
                                        Função/Cargo *
                                    </label>
                                    <div class="input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-briefcase"></i></span>
                                        <select class="form-select input-with-icon" id="person-role" required>
                                            <option value="">Selecione a função</option>
                                            ${ROLE_OPTIONS.map(role => `<option value="${role}">${role}</option>`).join('')}
                                            <option value="custom">Outra função...</option>
                                        </select>
                                    </div>
                                    <div class="input-icon-wrapper mt-3 d-none" id="person-role-custom-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-pencil-square"></i></span>
                                        <input type="text" class="form-control input-with-icon" id="person-role-custom" placeholder="Digite a função desejada">
                                    </div>
                                </div>
                                <div class="mb-4 form-field-icon">
                                    <label for="person-access-level" class="form-label form-label-icon">
                                        <i class="bi bi-shield-lock me-2"></i>
                                        Nível de Acesso *
                                    </label>
                                    <div class="input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-layers"></i></span>
                                        <select class="form-select input-with-icon" id="person-access-level" required>
                                        <option value="1" selected>Nível 1 - Portaria e áreas comuns</option>
                                        <option value="2">Nível 2 - Áreas comuns + Risco 1</option>
                                        <option value="3">Nível 3 - Todas as áreas</option>
                                        </select>
                                    </div>
                                    <small class="text-muted field-hint">Defina quais zonas RFID este colaborador pode acessar</small>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="person-submit-btn">
                                        <i class="bi bi-check-lg me-1"></i><span id="person-submit-label">Cadastrar Colaborador</span>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary d-none" id="person-cancel-edit">
                                        <i class="bi bi-x-circle me-1"></i>Cancelar edição
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div class="manual-entry-form" data-form="device">
                            <form id="device-form">
                                <div class="mb-3 form-field-icon">
                                    <label for="device-id" class="form-label form-label-icon">
                                        <i class="bi bi-upc-scan me-2"></i>
                                        ID do Dispositivo *
                                    </label>
                                    <div class="input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-upc"></i></span>
                                        <input type="text" class="form-control input-with-icon" id="device-id" placeholder="Ex: D001, SENSOR_01" required>
                                    </div>
                                    <div class="form-text field-hint">Use letras e números (ex: D001, SENSOR_01)</div>
                                </div>
                                <div class="mb-3 form-field-icon">
                                    <label for="device-type" class="form-label form-label-icon">
                                        <i class="bi bi-hdd-network me-2"></i>
                                        Tipo de Dispositivo *
                                    </label>
                                    <div class="input-icon-wrapper">
                                        <span class="input-icon-symbol"><i class="bi bi-tablet"></i></span>
                                        <select class="form-select input-with-icon" id="device-type" required>
                                        <option value="worker">Dispositivo de Colaborador</option>
                                        <option value="sensor">Sensor de Ambiente</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="device-submit-btn">
                                        <i class="bi bi-check-lg me-1"></i><span id="device-submit-label">Cadastrar Dispositivo</span>
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary d-none" id="device-cancel-edit">
                                        <i class="bi bi-x-circle me-1"></i>Cancelar edição
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div class="manual-entry-form" data-form="link">
                            <form id="link-form">
                                <p class="text-muted form-text-icon">
                                    <i class="bi bi-link-45deg me-2 text-primary"></i>
                                    Selecione um colaborador e um dispositivo do tipo <strong>Colaborador</strong> para concluir o pareamento manual.
                                </p>
                                <div class="row g-3 align-items-end">
                                    <div class="col-md-6">
                                        <label class="form-label form-label-icon" for="link-person">
                                            <i class="bi bi-person-lines-fill me-2"></i>
                                            Selecionar Colaborador
                                        </label>
                                        <div class="input-icon-wrapper">
                                            <span class="input-icon-symbol"><i class="bi bi-person-bounding-box"></i></span>
                                            <select class="form-select input-with-icon" id="link-person">
                                                <option value="">-- Selecione um colaborador --</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label form-label-icon" for="link-device">
                                            <i class="bi bi-tablet-landscape me-2"></i>
                                            Selecionar Dispositivo
                                        </label>
                                        <div class="input-icon-wrapper">
                                            <span class="input-icon-symbol"><i class="bi bi-cpu"></i></span>
                                            <select class="form-select input-with-icon" id="link-device">
                                                <option value="">-- Selecione um dispositivo --</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <button id="btn-link" type="button" class="btn btn-success w-100">
                                            <i class="bi bi-link me-1"></i>Vincular dispositivo
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="confirm-modal" id="confirm-modal" aria-hidden="true">
                <div class="confirm-modal__dialog">
                    <button type="button" class="confirm-modal__close" id="confirm-modal-close" aria-label="Fechar confirmação">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <div class="confirm-modal__icon" id="confirm-modal-icon">
                        <i class="bi bi-question-circle"></i>
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

    async function renderPeopleList(){
        const node = document.getElementById('people-list');
        if (!node) return;
        const people = await PeopleController.getAll();

        const searchTerm = LIST_STATE.people.search.trim().toLowerCase();
        const levelFilter = LIST_STATE.people.level;

        let filtered = people.filter(person => {
            const normalizedLevel = String(person.accessLevel || '1');
            if (levelFilter !== 'all' && normalizedLevel !== levelFilter) {
                return false;
            }
            if (!searchTerm) return true;
            const target = `${person.name || ''} ${person.role || ''}`.toLowerCase();
            return target.includes(searchTerm);
        });

        const sortKey = LIST_STATE.people.sort;
        filtered.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const levelA = Number(a.accessLevel || 1);
            const levelB = Number(b.accessLevel || 1);
            switch (sortKey) {
                case 'name-desc':
                    return nameB.localeCompare(nameA);
                case 'level-desc':
                    return levelB - levelA || nameA.localeCompare(nameB);
                case 'level-asc':
                    return levelA - levelB || nameA.localeCompare(nameB);
                case 'name-asc':
                default:
                    return nameA.localeCompare(nameB);
            }
        });

        const totalPages = filtered.length === 0 ? 1 : Math.ceil(filtered.length / LIST_STATE.people.perPage);
        if (filtered.length === 0) {
            LIST_STATE.people.page = 1;
            node.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-people display-5 text-muted mb-3"></i>
                    <p class="text-muted mb-0">Nenhum colaborador encontrado</p>
                </div>
            `;
        } else {
            LIST_STATE.people.page = Math.max(1, Math.min(LIST_STATE.people.page, totalPages));
            const startIndex = (LIST_STATE.people.page - 1) * LIST_STATE.people.perPage;
            const pageItems = filtered.slice(startIndex, startIndex + LIST_STATE.people.perPage);

            node.innerHTML = '';
            for (const person of pageItems){
            const personId = person.id || person._id;
            const levelBadge = getAccessLevelBadge(person.accessLevel);
            const initials = (person.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
            const card = document.createElement('div');
            card.className = 'card mb-3 border person-card';
            card.innerHTML = `
                <div class="card-body d-flex align-items-start">
                    <div class="person-card__avatar">${initials}</div>
                    <div class="flex-grow-1">
                        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between person-card__headline">
                            <div>
                                <h6 class="card-title mb-1">${person.name}</h6>
                                <p class="card-text small text-muted mb-1">
                                    <i class="bi bi-briefcase me-1"></i>${person.role}
                                </p>
                            </div>
                            <span class="mt-2 mt-lg-0 ${levelBadge.className}">${levelBadge.label}</span>
                        </div>
                        <div class="d-flex flex-wrap align-items-center gap-2 small text-muted">
                            <span class="badge ${person.deviceId ? 'badge-device-linked' : 'badge-device-unlinked'}">
                                <i class="bi bi-tablet me-1"></i>
                                ${person.deviceId ? person.deviceId : 'Sem dispositivo'}
                            </span>
                            <small class="text-muted">ID: ${personId}</small>
                        </div>
                    </div>
                    <div class="card-actions person-card__actions" role="group">
                        <button data-id="${personId}" class="btn btn-outline-primary btn-edit-person" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${person.deviceId ? `
                            <button data-id="${personId}" class="btn btn-outline-warning btn-unlink" title="Desvincular dispositivo">
                                <i class="bi bi-link-45deg"></i>
                            </button>
                        ` : ''}
                        <button data-id="${personId}" class="btn btn-outline-danger btn-remove-person" title="Remover">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
                node.appendChild(card);
            }
        }

        const infoNode = document.getElementById('people-page-info');
        if (infoNode) {
            if (filtered.length === 0) {
                infoNode.textContent = 'Página 0 de 0';
            } else {
                infoNode.textContent = `Página ${LIST_STATE.people.page} de ${totalPages}`;
            }
        }
        const prevBtn = document.getElementById('people-prev');
        if (prevBtn) {
            prevBtn.disabled = filtered.length === 0 || LIST_STATE.people.page <= 1;
        }
        const nextBtn = document.getElementById('people-next');
        if (nextBtn) {
            nextBtn.disabled = filtered.length === 0 || LIST_STATE.people.page >= totalPages;
        }
    }

    function getDeviceStatusDescriptor(device, zones){
        const deviceId = (device.id || '').toLowerCase();
        const deviceZone = zones.find(z => z.deviceId && z.deviceId.toLowerCase() === deviceId) || null;
        const isPhysicallyActive = device.active === true;
        const zoneOnline = deviceZone ? (deviceZone.currentlyActive === true && deviceZone.connectionStatus === 'online') : false;
        const isOnline = isPhysicallyActive && zoneOnline;
        const statusKey = !isPhysicallyActive ? 'inactive' : (isOnline ? 'online' : 'offline');
        return {
            deviceZone,
            isPhysicallyActive,
            zoneOnline,
            isOnline,
            statusKey,
            statusIcon: isOnline ? 'bi-circle-fill' : 'bi-circle',
            statusText: !isPhysicallyActive ? 'DESATIVADO' : (isOnline ? 'ONLINE' : 'Offline'),
            statusClass: !isPhysicallyActive ? 'device-status-off' : (isOnline ? 'device-status-on' : 'device-status-idle')
        };
    }

    async function renderDevicesList(){
        console.log('🔄 [renderDevicesList] Iniciando...');
        const node = document.getElementById('devices-list');
        const devices = await DevicesController.getAll();
        const people = await PeopleController.getAll();
        
        console.log('📦 [renderDevicesList] Devices:', devices.map(d => ({id: d.id, active: d.active, connectionStatus: d.connectionStatus})));
        
        // ✅ BUSCAR ZONAS PARA VERIFICAR currentlyActive
        const zonesResponse = await fetch('http://localhost:3000/api/zones', {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const zonesData = await zonesResponse.json();
        const zones = zonesData.success ? zonesData.data : [];
        
        console.log('🗺️ [renderDevicesList] Zones:', zones.map(z => ({id: z.id, name: z.name, deviceId: z.deviceId, currentlyActive: z.currentlyActive, connectionStatus: z.connectionStatus})));
        
        const descriptorCache = new Map();
        const getDescriptor = (device) => {
            if (!descriptorCache.has(device.id)) {
                descriptorCache.set(device.id, getDeviceStatusDescriptor(device, zones));
            }
            return descriptorCache.get(device.id);
        };

        const searchTerm = LIST_STATE.devices.search.trim().toLowerCase();
        const typeFilter = LIST_STATE.devices.type;
        const statusFilter = LIST_STATE.devices.status;

        let filtered = devices.filter(device => {
            if (typeFilter !== 'all' && device.type !== typeFilter) {
                return false;
            }
            const descriptor = getDescriptor(device);
            if (statusFilter !== 'all' && descriptor.statusKey !== statusFilter) {
                return false;
            }
            if (searchTerm) {
                const person = people.find(p => p.deviceId === device.id);
                const zoneName = descriptor.deviceZone ? descriptor.deviceZone.name : '';
                const haystack = `${device.id || ''} ${person ? person.name : ''} ${zoneName}`.toLowerCase();
                if (!haystack.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });

        const sortKey = LIST_STATE.devices.sort;
        const statusWeight = (descriptor) => {
            if (descriptor.statusKey === 'online') return 2;
            if (descriptor.statusKey === 'offline') return 1;
            return 0; // inactive
        };
        filtered.sort((a, b) => {
            const descA = getDescriptor(a);
            const descB = getDescriptor(b);
            const idA = (a.id || '').toLowerCase();
            const idB = (b.id || '').toLowerCase();
            switch (sortKey) {
                case 'status-asc':
                    return statusWeight(descA) - statusWeight(descB) || idA.localeCompare(idB);
                case 'id-desc':
                    return idB.localeCompare(idA);
                case 'id-asc':
                    return idA.localeCompare(idB);
                case 'type':
                    return (a.type || '').localeCompare(b.type || '') || idA.localeCompare(idB);
                case 'status-desc':
                default:
                    return statusWeight(descB) - statusWeight(descA) || idA.localeCompare(idB);
            }
        });

        const totalPages = filtered.length === 0 ? 1 : Math.ceil(filtered.length / LIST_STATE.devices.perPage);
        if (filtered.length === 0) {
            LIST_STATE.devices.page = 1;
            node.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-tablet display-5 text-muted mb-3"></i>
                    <p class="text-muted mb-0">Nenhum dispositivo encontrado</p>
                </div>
            `;
        } else {
            LIST_STATE.devices.page = Math.max(1, Math.min(LIST_STATE.devices.page, totalPages));
            const startIndex = (LIST_STATE.devices.page - 1) * LIST_STATE.devices.perPage;
            const pageItems = filtered.slice(startIndex, startIndex + LIST_STATE.devices.perPage);
            node.innerHTML = '';
            for (const device of pageItems){
                const descriptor = getDescriptor(device);
                const person = people.find(p => p.deviceId === device.id);

                const card = document.createElement('div');
                card.className = 'card mb-3 border device-card';
                card.innerHTML = `
                    <div class="card-body d-flex align-items-start">
                        <div class="device-card__avatar ${descriptor.isOnline ? 'device-card__avatar--online' : ''}">
                            <i class="bi bi-tablet"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between device-card__headline">
                                <h6 class="card-title mb-1">${device.id}</h6>
                                <span class="badge device-status ${descriptor.statusClass}">
                                    <i class="bi ${descriptor.statusIcon} me-1"></i>${descriptor.statusText}
                                </span>
                            </div>
                            <p class="card-text small text-muted mb-1 d-flex flex-wrap align-items-center gap-2">
                                <span class="badge ${device.type === 'worker' ? 'device-type-badge badge-worker' : 'device-type-badge badge-sensor'}">
                                    ${device.type === 'worker' ? 'Colaborador' : 'Sensor'}
                                </span>
                                ${descriptor.deviceZone ? `<span class="badge zone-badge">Área: ${descriptor.deviceZone.name}</span>` : ''}
                            </p>
                            <p class="card-text small text-muted mb-0">
                                <i class="bi bi-person me-1"></i>
                                ${person ? `Vinculado a: ${person.name}` : 'Sem vínculo'}
                            </p>
                        </div>
                        <div class="card-actions device-card__actions" role="group">
                            <button data-id="${device.id}" class="btn btn-outline-primary btn-edit-device" title="Editar dispositivo">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button data-id="${device.id}" class="btn btn-outline-danger btn-remove-device" title="Remover">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                // aumentar um pouco a altura mínima dos cards de dispositivo
                try {
                    card.style.minHeight = '100px';
                } catch (err) {
                    // não fatal — só garante compatibilidade em navegadores estranhos
                    console.warn('Não foi possível aplicar minHeight ao card de dispositivo', err);
                }
                node.appendChild(card);
            }
        }

        const infoNode = document.getElementById('devices-page-info');
        if (infoNode) {
            if (filtered.length === 0) {
                infoNode.textContent = 'Página 0 de 0';
            } else {
                infoNode.textContent = `Página ${LIST_STATE.devices.page} de ${totalPages}`;
            }
        }
        const prevBtn = document.getElementById('devices-prev');
        if (prevBtn) {
            prevBtn.disabled = filtered.length === 0 || LIST_STATE.devices.page <= 1;
        }
        const nextBtn = document.getElementById('devices-next');
        if (nextBtn) {
            nextBtn.disabled = filtered.length === 0 || LIST_STATE.devices.page >= totalPages;
        }
    }

    async function populateLinkSelects(){
        const personSelect = document.getElementById('link-person');
        const deviceSelect = document.getElementById('link-device');
        
        // ✅ SALVAR VALORES SELECIONADOS ANTES DE ATUALIZAR
        const selectedPersonId = personSelect?.value || '';
        const selectedDeviceId = deviceSelect?.value || '';
        
        const people = await PeopleController.getAll();
        const devices = await DevicesController.getAll();
        
        // Pessoas sem dispositivo
        personSelect.innerHTML = '<option value="">-- Selecione um colaborador --</option>';
        people.forEach(person => {
            const personId = person.id || person._id;
            if (!personId) return;
            if (!person.deviceId) {
                const opt = document.createElement('option');
                opt.value = personId;
                opt.textContent = `${person.name} - ${person.role}`;
                personSelect.appendChild(opt);
            }
        });
        
        // Dispositivos sem vínculo — apenas dispositivos do tipo 'worker' (Colaborador)
        deviceSelect.innerHTML = '<option value="">-- Selecione um dispositivo --</option>';
        devices.forEach(device => {
            if (device.type !== 'worker') return; // só mostrar dispositivos de colaborador
            const personWithDevice = people.find(p => p.deviceId === device.id);
            if (!personWithDevice) {
                const opt = document.createElement('option');
                opt.value = device.id;
                opt.textContent = `${device.id} (${device.type === 'worker' ? 'Colaborador' : 'Sensor'})`;
                deviceSelect.appendChild(opt);
            }
        });
        
        // ✅ RESTAURAR VALORES SELECIONADOS SE AINDA EXISTIREM NAS OPTIONS
        if (selectedPersonId) {
            const personOption = Array.from(personSelect.options).find(opt => opt.value === selectedPersonId);
            if (personOption) {
                personSelect.value = selectedPersonId;
            }
        }
        
        if (selectedDeviceId) {
            const deviceOption = Array.from(deviceSelect.options).find(opt => opt.value === selectedDeviceId);
            if (deviceOption) {
                deviceSelect.value = selectedDeviceId;
            }
        }
    }

    async function updateCounters(){
        const people = await PeopleController.getAll();
        const devices = await DevicesController.getAll();

        const activeDevices = devices.filter(device => device.active).length;
        // Disponíveis = dispositivos tipo 'worker' que não estão atribuídos
        const availableDevices = devices.filter(device => {
            if (device.type !== 'worker') return false;
            const assigned = people.some(person => person.deviceId === device.id);
            return !assigned;
        }).length;

        const counters = [
            { id: 'people-count', value: people.length },
            { id: 'devices-count', value: devices.length },
            { id: 'devices-active-count', value: activeDevices },
            { id: 'devices-available-count', value: availableDevices },
            { id: 'linkable-counter', value: availableDevices }
        ];

        counters.forEach(counter => {
            const node = document.getElementById(counter.id);
            if (node) {
                node.textContent = counter.value;
            }
        });
    }

    function showAlert(message, type = 'success') {
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

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'toast-icon';
        iconWrapper.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i>`;

        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'toast-message';
        messageWrapper.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Fechar notificação');
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';

        toast.appendChild(iconWrapper);
        toast.appendChild(messageWrapper);
        toast.appendChild(closeBtn);
        stack.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });

        const removeToast = () => {
            toast.classList.remove('is-visible');
            toast.classList.add('is-hiding');
            setTimeout(() => {
                toast.remove();
                if (!stack.hasChildNodes()) {
                    stack.remove();
                }
            }, 250);
        };

        const timer = setTimeout(removeToast, 5000);

        closeBtn.addEventListener('click', () => {
            clearTimeout(timer);
            removeToast();
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

        const titleNode = document.getElementById('confirm-modal-title');
        const messageNode = document.getElementById('confirm-modal-message');
        const kickerNode = document.getElementById('confirm-modal-kicker');
        const iconNode = document.getElementById('confirm-modal-icon');
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const closeBtn = document.getElementById('confirm-modal-close');

        titleNode.textContent = title;
        messageNode.textContent = message;
        kickerNode.textContent = kicker;
        iconNode.innerHTML = `<i class="bi ${icon}"></i>`;
        confirmBtn.textContent = confirmLabel;
        cancelBtn.textContent = cancelLabel;

        modal.classList.remove('confirm-modal--danger', 'confirm-modal--warning', 'confirm-modal--success', 'confirm-modal--info');
        modal.classList.add(`confirm-modal--${variant}`);

        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('confirm-modal-open');

        requestAnimationFrame(() => {
            modal.classList.add('is-visible');
        });

        return new Promise(resolve => {
            const cleanup = () => {
                modal.classList.remove('is-visible');
                modal.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('confirm-modal-open');
                modal.removeEventListener('click', overlayHandler);
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
                if (closeBtn) {
                    closeBtn.removeEventListener('click', cancelHandler);
                }
            };

            const confirmHandler = () => {
                cleanup();
                resolve(true);
            };

            const cancelHandler = () => {
                cleanup();
                resolve(false);
            };

            const overlayHandler = (event) => {
                if (event.target === modal) {
                    cancelHandler();
                }
            };

            confirmBtn.addEventListener('click', confirmHandler);
            cancelBtn.addEventListener('click', cancelHandler);
            if (closeBtn) {
                closeBtn.addEventListener('click', cancelHandler);
            }
            modal.addEventListener('click', overlayHandler);
        });
    }

    function resetPersonForm(){
        editingPersonId = null;
        const form = document.getElementById('person-form');
        if (form) {
            form.reset();
        }
        setRoleFieldValue('');
        const accessSelect = document.getElementById('person-access-level');
        if (accessSelect) {
            accessSelect.value = '1';
        }
        const label = document.getElementById('person-submit-label');
        if (label) {
            label.textContent = 'Cadastrar Colaborador';
        }
        const cancelBtn = document.getElementById('person-cancel-edit');
        if (cancelBtn) {
            cancelBtn.classList.add('d-none');
        }
        setManualEntryTab('person');

        const panel = document.getElementById('manual-entry-panel');
        if (panel) {
            panel.classList.remove('manual-entry-editing');
            panel.dataset.editing = 'false';
            panel.dataset.editTarget = '';
            const kickerNode = panel.querySelector('.manual-entry-panel__kicker');
            const titleNode = panel.querySelector('#manual-entry-panel-title');
            if (kickerNode) {
                kickerNode.textContent = 'Cadastro manual';
            }
            if (titleNode) {
                titleNode.textContent = 'Adicionar colaborador ou dispositivo';
            }
        }
    }

    function resetDeviceForm(){
        editingDeviceId = null;
        const form = document.getElementById('device-form');
        if (form) {
            form.reset();
        }
        const label = document.getElementById('device-submit-label');
        if (label) {
            label.textContent = 'Cadastrar Dispositivo';
        }
        const cancelBtn = document.getElementById('device-cancel-edit');
        if (cancelBtn) {
            cancelBtn.classList.add('d-none');
        }
        const panel = document.getElementById('manual-entry-panel');
        if (panel) {
            panel.classList.remove('manual-entry-editing');
            panel.dataset.editing = 'false';
            panel.dataset.editTarget = '';
            const kickerNode = panel.querySelector('.manual-entry-panel__kicker');
            const titleNode = panel.querySelector('#manual-entry-panel-title');
            if (kickerNode) {
                kickerNode.textContent = 'Cadastro manual';
            }
            if (titleNode) {
                titleNode.textContent = 'Adicionar colaborador ou dispositivo';
            }
        }
    }

    async function startEditPerson(personId){
        const person = await PeopleModel.find(personId);
        if (!person) {
            showAlert('Não foi possível carregar os dados do colaborador para edição.', 'danger');
            return;
        }
        openManualEntryPanel('person', {
            editingMode: true,
            title: 'Editar colaborador',
            kicker: 'Atualização em andamento'
        });
        editingPersonId = personId;
        const nameInput = document.getElementById('person-name');
        const accessSelect = document.getElementById('person-access-level');
        if (nameInput) nameInput.value = person.name || '';
        setRoleFieldValue(person.role || '');
        if (accessSelect) accessSelect.value = String(person.accessLevel || 1);
        const label = document.getElementById('person-submit-label');
        if (label) {
            label.textContent = 'Salvar alterações';
        }
        const cancelBtn = document.getElementById('person-cancel-edit');
        if (cancelBtn) {
            cancelBtn.classList.remove('d-none');
        }
    }

    async function startEditDevice(deviceId){
        const device = await DevicesModel.find(deviceId);
        if (!device) {
            showAlert('Não foi possível carregar os dados do dispositivo para edição.', 'danger');
            return;
        }
        editingDeviceId = deviceId;
        openManualEntryPanel('device', {
            editingMode: true,
            title: 'Editar dispositivo',
            kicker: 'Inventário em edição'
        });
        const idInput = document.getElementById('device-id');
        const typeSelect = document.getElementById('device-type');
        if (idInput) {
            idInput.value = device.id || '';
        }
        if (typeSelect) {
            typeSelect.value = device.type || 'worker';
        }
        const label = document.getElementById('device-submit-label');
        if (label) {
            label.textContent = 'Salvar alterações';
        }
        const cancelBtn = document.getElementById('device-cancel-edit');
        if (cancelBtn) {
            cancelBtn.classList.remove('d-none');
        }
    }

    function bindEvents(){
        document.querySelectorAll('[data-manual-entry-target]').forEach(button => {
            button.addEventListener('click', () => {
                const target = button.getAttribute('data-manual-entry-target') || 'person';
                openManualEntryPanel(target);
            });
        });

        const closeManualEntryBtn = document.getElementById('close-manual-entry');
        if (closeManualEntryBtn) {
            closeManualEntryBtn.addEventListener('click', () => closeManualEntryPanel());
        }

        const manualEntryPanel = document.getElementById('manual-entry-panel');
        if (manualEntryPanel) {
            manualEntryPanel.addEventListener('click', (e) => {
                if (e.target === manualEntryPanel) {
                    closeManualEntryPanel();
                }
            });
        }

        document.querySelectorAll('.manual-entry-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                setManualEntryTab(tab.dataset.target);
            });
        });

        const personForm = document.getElementById('person-form');
        if (personForm) {
            personForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('person-name').value.trim();
                const role = getRoleFieldValue();
                const accessLevel = Number(document.getElementById('person-access-level').value) || 1;

                if (!role) {
                    showAlert('Selecione ou informe uma função/cargo.', 'warning');
                    return;
                }
                
                if (editingPersonId) {
                    const result = await PeopleController.update(editingPersonId, { name, role, accessLevel });
                    if (result.success) {
                        showAlert('Colaborador atualizado com sucesso!');
                        resetPersonForm();
                        closeManualEntryPanel();
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                } else {
                    const result = await PeopleController.add({ name, role, accessLevel });
                    if (result.success) {
                        showAlert('Colaborador cadastrado com sucesso!');
                        resetPersonForm();
                        closeManualEntryPanel();
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            });
        }

        const personRoleSelect = document.getElementById('person-role');
        if (personRoleSelect) {
            personRoleSelect.addEventListener('change', handleRoleSelectChange);
            handleRoleSelectChange();
        }

        const cancelEditBtn = document.getElementById('person-cancel-edit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                resetPersonForm();
            });
        }

        const deviceForm = document.getElementById('device-form');
        if (deviceForm) {
            deviceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('device-id').value.trim().toUpperCase();
                const type = document.getElementById('device-type').value;

                if (editingDeviceId) {
                    const result = await DevicesController.update(editingDeviceId, { id, type });
                    if (result.success) {
                        showAlert('Dispositivo atualizado com sucesso!');
                        resetDeviceForm();
                        closeManualEntryPanel();
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                } else {
                    const result = await DevicesController.add({ id, type });
                    if (result.success) {
                        showAlert('Dispositivo cadastrado com sucesso!');
                        deviceForm.reset();
                        closeManualEntryPanel();
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            });
        }

        const cancelDeviceEditBtn = document.getElementById('device-cancel-edit');
        if (cancelDeviceEditBtn) {
            cancelDeviceEditBtn.addEventListener('click', () => {
                resetDeviceForm();
            });
        }

        const linkButton = document.getElementById('btn-link');
        if (linkButton) {
            linkButton.addEventListener('click', async () => {
                const personId = document.getElementById('link-person').value;
                const deviceId = document.getElementById('link-device').value;
                
                if (!personId || !deviceId) {
                    showAlert('Selecione um colaborador e um dispositivo para vincular', 'warning');
                    return;
                }
                
                const person = await PeopleModel.find(personId);
                if (person) {
                    const result = await PeopleController.update(personId, { deviceId: deviceId });
                    if (result.success) {
                        showAlert('Dispositivo vinculado com sucesso!');
                        closeManualEntryPanel();
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            });
        }

        const peopleList = document.getElementById('people-list');
        if (peopleList) {
            peopleList.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-edit-person')) {
                    const btn = e.target.closest('.btn-edit-person');
                    const id = btn.getAttribute('data-id');
                    await startEditPerson(id);
                    return;
                }

                if (e.target.closest('.btn-remove-person')) {
                    const btn = e.target.closest('.btn-remove-person');
                    const id = btn.getAttribute('data-id');
                    const person = await PeopleModel.find(id);
                    const accepted = await showConfirmModal({
                        title: 'Remover colaborador',
                        message: `Tem certeza que deseja remover ${person.name}? Esta ação não poderá ser desfeita.`,
                        confirmLabel: 'Remover',
                        variant: 'danger',
                        kicker: 'Exclusão definitiva',
                        icon: 'bi-person-dash'
                    });
                    if (!accepted) {
                        return;
                    }
                    const result = await PeopleController.remove(id);
                    if (result.success) {
                        showAlert('Colaborador removido com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
                
                if (e.target.closest('.btn-unlink')) {
                    const btn = e.target.closest('.btn-unlink');
                    const id = btn.getAttribute('data-id');
                    const person = await PeopleModel.find(id);
                    const accepted = await showConfirmModal({
                        title: 'Desvincular dispositivo',
                        message: `Desvincular o dispositivo ${person.deviceId} de ${person.name}?`,
                        confirmLabel: 'Desvincular',
                        variant: 'warning',
                        kicker: 'Pareamento manual',
                        icon: 'bi-link-45deg'
                    });
                    if (!accepted) {
                        return;
                    }
                    const result = await PeopleController.update(id, { deviceId: null });
                    if (result.success) {
                        showAlert('Dispositivo desvinculado com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
            });
        }

        const devicesList = document.getElementById('devices-list');
        if (devicesList) {
            devicesList.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-edit-device')) {
                    const btn = e.target.closest('.btn-edit-device');
                    const id = btn.getAttribute('data-id');
                    await startEditDevice(id);
                    return;
                }

                if (e.target.closest('.btn-remove-device')) {
                    const btn = e.target.closest('.btn-remove-device');
                    const id = btn.getAttribute('data-id');
                    const device = await DevicesModel.find(id);
                    const accepted = await showConfirmModal({
                        title: 'Remover dispositivo',
                        message: `Tem certeza que deseja remover o dispositivo ${device.id}?`,
                        confirmLabel: 'Remover dispositivo',
                        variant: 'danger',
                        kicker: 'Inventário de ativos',
                        icon: 'bi-tablet-fill'
                    });
                    if (!accepted) {
                        return;
                    }
                    const result = await DevicesController.remove(id);
                    if (result.success) {
                        showAlert('Dispositivo removido com sucesso!');
                        await render();
                    } else {
                        showAlert(`Erro: ${result.error}`, 'danger');
                    }
                }
                
            });
        }

        // Controles de toolbar - Colaboradores
        const peopleSearchInput = document.getElementById('people-search');
        if (peopleSearchInput) {
            peopleSearchInput.value = LIST_STATE.people.search;
            peopleSearchInput.addEventListener('input', (e) => {
                LIST_STATE.people.search = e.target.value;
                LIST_STATE.people.page = 1;
                renderPeopleList();
            });
        }

        const peopleLevelFilter = document.getElementById('people-level-filter');
        if (peopleLevelFilter) {
            peopleLevelFilter.value = LIST_STATE.people.level;
            peopleLevelFilter.addEventListener('change', (e) => {
                LIST_STATE.people.level = e.target.value;
                LIST_STATE.people.page = 1;
                renderPeopleList();
            });
        }

        const peopleSortSelect = document.getElementById('people-sort');
        if (peopleSortSelect) {
            peopleSortSelect.value = LIST_STATE.people.sort;
            peopleSortSelect.addEventListener('change', (e) => {
                LIST_STATE.people.sort = e.target.value;
                LIST_STATE.people.page = 1;
                renderPeopleList();
            });
        }

        const peoplePrevBtn = document.getElementById('people-prev');
        if (peoplePrevBtn) {
            peoplePrevBtn.addEventListener('click', () => {
                if (LIST_STATE.people.page > 1) {
                    LIST_STATE.people.page -= 1;
                    renderPeopleList();
                }
            });
        }

        const peopleNextBtn = document.getElementById('people-next');
        if (peopleNextBtn) {
            peopleNextBtn.addEventListener('click', () => {
                LIST_STATE.people.page += 1;
                renderPeopleList();
            });
        }

        // Controles de toolbar - Dispositivos
        const devicesSearchInput = document.getElementById('devices-search');
        if (devicesSearchInput) {
            devicesSearchInput.value = LIST_STATE.devices.search;
            devicesSearchInput.addEventListener('input', (e) => {
                LIST_STATE.devices.search = e.target.value;
                LIST_STATE.devices.page = 1;
                renderDevicesList();
            });
        }

        const devicesTypeFilter = document.getElementById('devices-type-filter');
        if (devicesTypeFilter) {
            devicesTypeFilter.value = LIST_STATE.devices.type;
            devicesTypeFilter.addEventListener('change', (e) => {
                LIST_STATE.devices.type = e.target.value;
                LIST_STATE.devices.page = 1;
                renderDevicesList();
            });
        }

        const devicesStatusFilter = document.getElementById('devices-status-filter');
        if (devicesStatusFilter) {
            devicesStatusFilter.value = LIST_STATE.devices.status;
            devicesStatusFilter.addEventListener('change', (e) => {
                LIST_STATE.devices.status = e.target.value;
                LIST_STATE.devices.page = 1;
                renderDevicesList();
            });
        }

        const devicesSortSelect = document.getElementById('devices-sort');
        if (devicesSortSelect) {
            devicesSortSelect.value = LIST_STATE.devices.sort;
            devicesSortSelect.addEventListener('change', (e) => {
                LIST_STATE.devices.sort = e.target.value;
                LIST_STATE.devices.page = 1;
                renderDevicesList();
            });
        }

        const devicesPrevBtn = document.getElementById('devices-prev');
        if (devicesPrevBtn) {
            devicesPrevBtn.addEventListener('click', () => {
                if (LIST_STATE.devices.page > 1) {
                    LIST_STATE.devices.page -= 1;
                    renderDevicesList();
                }
            });
        }

        const devicesNextBtn = document.getElementById('devices-next');
        if (devicesNextBtn) {
            devicesNextBtn.addEventListener('click', () => {
                LIST_STATE.devices.page += 1;
                renderDevicesList();
            });
        }

        document.querySelectorAll('[data-filter-toggle]').forEach(button => {
            const target = button.getAttribute('data-filter-toggle');
            button.addEventListener('click', () => toggleFilterPanel(target));
        });
    }

    async function render(){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = template();
        Object.keys(FILTER_CONFIG).forEach(target => {
            const isOpen = LIST_STATE[target] ? LIST_STATE[target].filtersOpen : false;
            setFilterPanelVisibility(target, isOpen);
        });
        resetPersonForm();
        resetDeviceForm();
        await renderPeopleList();
        await renderDevicesList();
        await populateLinkSelects();
        await updateCounters();
        bindEvents();
        
        // ✅ Iniciar auto-refresh a cada 3 segundos
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        console.log('🚀 [render] Configurando auto-refresh...');
        refreshInterval = setInterval(async () => {
            console.log('🔄 [auto-refresh] Executando atualização automática...');
            try {
                await renderPeopleList();
                await renderDevicesList();
                await populateLinkSelects();
                await updateCounters();
                console.log('✅ [auto-refresh] Atualização concluída');
            } catch (error) {
                console.error('❌ [auto-refresh] Erro:', error);
            }
        }, 3000);
        console.log('✅ Auto-refresh iniciado (3s) para Gestão de Recursos');
    }
    
    // Função de cleanup - parar auto-refresh ao sair da view
    function cleanup() {
        console.log('🧹 Limpando CombinedView...');
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
            console.log('⏹️ Auto-refresh parado');
        }
    }

    return { render, cleanup };
})();