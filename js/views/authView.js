// js/views/authView.js - Interface de Login/Registro com visual alinhado ao dashboard
const AuthView = (function(){
    const root = document.getElementById('view-root');

    function hideChrome() {
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        if (header) header.classList.add('d-none');
        if (footer) footer.classList.add('d-none');
        document.body.classList.add('bg-dark');
    }

    function template(){
        return `
        <style>
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .auth-map-zone { 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: fadeInUp 0.5s ease-out backwards;
            }
            .auth-map-zone:nth-child(2) { animation-delay: 0.1s; }
            .auth-map-zone:nth-child(3) { animation-delay: 0.2s; }
            .auth-map-zone:nth-child(4) { animation-delay: 0.3s; }
            .auth-map-zone:nth-child(5) { animation-delay: 0.4s; }
            .auth-map-zone:nth-child(6) { animation-delay: 0.5s; }
            .auth-map-zone:nth-child(7) { animation-delay: 0.6s; }
            
            .auth-map-zone:hover { 
                transform: scale(1.08) translateY(-4px); 
                box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
                z-index: 10;
            }
            
            .auth-login-card { 
                backdrop-filter: blur(16px) saturate(180%); 
                background: linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)) !important;
                border: 1px solid rgba(255,255,255,0.5) !important;
                animation: slideInRight 0.6s ease-out;
            }
            
            .auth-form .form-control {
                border-radius: 10px;
                border: 2px solid #e2e8f0;
                transition: all 0.3s;
                padding: 8px 12px;
                font-size: 0.85rem;
            }
            
            .auth-form .form-control:focus {
                border-color: #0ea5e9;
                box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
                transform: translateY(-1px);
            }
            
            .auth-form .input-group { border-radius: 12px; overflow: hidden; }
            
            .auth-btn-primary {
                background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #0284c7 100%);
                border: none;
                border-radius: 12px;
                padding: 12px;
                font-weight: 700;
                font-size: 0.9rem;
                color: white;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
                position: relative;
                overflow: hidden;
            }
            
            .auth-btn-primary:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 28px rgba(14, 165, 233, 0.5);
            }
            
            .auth-btn-primary:active {
                transform: translateY(-1px);
            }
            
            .auth-tab-btn {
                border-radius: 10px;
                padding: 8px 18px;
                font-weight: 600;
                transition: all 0.3s;
                border: 2px solid transparent;
                font-size: 0.85rem;
            }
            
            .auth-tab-active {
                background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
                color: white !important;
                box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
                transform: scale(1.05);
            }
            
            .auth-tab-btn:not(.auth-tab-active) {
                background: rgba(226, 232, 240, 0.5);
                color: #64748b;
            }
            
            .auth-tab-btn:not(.auth-tab-active):hover {
                background: rgba(226, 232, 240, 0.8);
                border-color: #cbd5e1;
                transform: scale(1.02);
            }
            
            .auth-header-badge {
                background: linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #d97706 100%);
                color: white;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 0.65rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .auth-stat-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 14px;
                padding: 12px 16px;
                transition: all 0.3s;
            }
            
            .auth-stat-card:hover {
                background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08));
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            }
            
            .form-label-enhanced {
                font-weight: 600;
                color: #334155;
                font-size: 0.85rem;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .auth-security-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(16, 185, 129, 0.1);
                color: #059669;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
            }
        </style>
        <div class="container-fluid py-3">
            <div class="row justify-content-center">
                <div class="col-12 col-xxl-11">
                    <div class="card border-0 shadow-lg text-white" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); overflow:hidden;">
                        <div class="card-body p-3 p-lg-4">
                            <div class="row g-3 align-items-stretch">
                                <div class="col-xl-7">
                                    <div class="d-flex flex-column gap-3 h-100">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span class="auth-header-badge">
                                                    <i class="bi bi-cpu-fill"></i>
                                                    Connection-4
                                                </span>
                                                <h2 class="mt-2 mb-2 fw-bold" style="font-size: 1.5rem; letter-spacing: -0.3px;">
                                                    <i class="bi bi-globe2 me-2" style="color: #06b6d4; font-size: 1.3rem;"></i>Mapa Inteligente
                                                </h2>
                                                <p class="mb-0 text-white-75 d-flex align-items-center gap-2" style="font-size: 0.85rem;">
                                                    <i class="bi bi-shield-check" style="color: #10b981;"></i>
                                                    Monitoramento em tempo real com zonas dinâmicas e sensores IoT
                                                </p>
                                            </div>
                                        </div>
                                        <div class="d-flex flex-wrap gap-3">
                                            <div class="auth-stat-card" style="border-color: rgba(16, 185, 129, 0.4);">
                                                <div class="d-flex align-items-center gap-3">
                                                    <div class="p-2 rounded-circle" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                                        <i class="bi bi-clock-history text-white fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <div class="fw-bold fs-4 text-white" style="line-height: 1;">24/7</div>
                                                        <small class="text-white-75 fw-semibold">Monitoramento Ativo</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="auth-stat-card" style="border-color: rgba(139, 92, 246, 0.4);">
                                                <div class="d-flex align-items-center gap-3">
                                                    <div class="p-2 rounded-circle" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                                                        <i class="bi bi-geo-alt-fill text-white fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <div class="fw-bold fs-4 text-white" style="line-height: 1;">IoT</div>
                                                        <small class="text-white-75 fw-semibold">Zonas Conectadas</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="auth-stat-card" style="border-color: rgba(245, 158, 11, 0.4);">
                                                <div class="d-flex align-items-center gap-3">
                                                    <div class="p-2 rounded-circle" style="background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                                                        <i class="bi bi-lightning-charge-fill text-white fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <div class="fw-bold fs-4 text-white" style="line-height: 1;">Real-Time</div>
                                                        <small class="text-white-75 fw-semibold">Sincronização</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rounded-4 position-relative overflow-hidden" aria-live="polite" id="auth-map-preview" style="flex: 1; min-height: 400px; background: linear-gradient(145deg, #1e293b, #0f172a); border: 2px solid rgba(148, 163, 184, 0.2); box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);">
                                            <div class="d-flex align-items-center justify-content-center text-white-50 h-100" id="auth-map-preview-placeholder">
                                                <div class="text-center">
                                                    <div class="spinner-border text-info mb-2" role="status"></div>
                                                    <div>Sincronizando mapa...</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                    </div>
                                </div>
                                <div class="col-xl-5">
                                    <div class="card shadow-lg border-0 h-100 auth-login-card">
                                        <div class="card-body p-4 p-lg-5 d-flex flex-column">
                                            <div class="mb-4">
                                                <div class="d-flex align-items-center justify-content-between mb-3">
                                                    <div class="flex-grow-1">
                                                       
                                                        <h4 class="mb-1 fw-bold text-dark d-flex align-items-center gap-2" id="auth-title">
                                                            <i class="bi bi-person-circle text-primary"></i>
                                                            Entrar
                                                        </h4>
                                                        <p class="text-muted mb-0 small d-flex align-items-center gap-1" id="auth-subtitle">
                                                            <i class="bi bi-arrow-right-short"></i>
                                                            Acesse o painel de controle
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="d-flex gap-2 mb-4 p-2 rounded-3" style="background: linear-gradient(135deg, #f8fafc, #f1f5f9);">
                                                <button type="button" class="btn flex-fill auth-tab-btn auth-tab-active" data-auth-tab="login">
                                                    <i class="bi bi-box-arrow-in-right me-2"></i>Login
                                                </button>
                                                <button type="button" class="btn flex-fill auth-tab-btn" data-auth-tab="register">
                                                    <i class="bi bi-person-plus-fill me-2"></i>Registrar
                                                </button>
                                            </div>

                                            <form id="login-form" data-auth-form="login" class="auth-form flex-grow-1 d-flex flex-column">
                                                <div class="mb-3">
                                                    <label for="login-email" class="form-label-enhanced">
                                                        <i class="bi bi-envelope-fill text-primary"></i>
                                                        Email corporativo
                                                    </label>
                                                    <div class="position-relative">
                                                        <input type="email" class="form-control form-control-lg ps-5" id="login-email" placeholder="seu@email.com" required style="background: #f8fafc;">
                                                        <i class="bi bi-person-fill position-absolute text-muted" style="left: 16px; top: 50%; transform: translateY(-50%); font-size: 1.1rem;"></i>
                                                    </div>
                                                </div>
                                                <div class="mb-4">
                                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                                        <label for="login-password" class="form-label-enhanced mb-0">
                                                            <i class="bi bi-lock-fill text-primary"></i>
                                                            Senha
                                                        </label>
                                                        <a href="#" class="text-decoration-none small text-primary fw-semibold">
                                                            <i class="bi bi-question-circle me-1"></i>Esqueceu?
                                                        </a>
                                                    </div>
                                                    <div class="position-relative">
                                                        <input type="password" class="form-control form-control-lg ps-5 pe-5" id="login-password" placeholder="Digite sua senha" required style="background: #f8fafc;">
                                                        <i class="bi bi-shield-lock-fill position-absolute text-muted" style="left: 16px; top: 50%; transform: translateY(-50%); font-size: 1.1rem;"></i>
                                                        <button class="btn btn-link position-absolute text-muted" type="button" id="toggle-password" style="right: 8px; top: 50%; transform: translateY(-50%);">
                                                            <i class="bi bi-eye"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="mt-auto">
                                                    <button type="submit" class="btn w-100 auth-btn-primary" id="login-btn">
                                                        <i class="bi bi-check-circle-fill me-2"></i>Entrar no Sistema
                                                    </button>
                                                    <div class="text-center mt-3 p-3 rounded-3" style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0;">
                                                        <button type="button" class="btn btn-link text-decoration-none p-0" data-auth-tab-trigger="register">
                                                            <span class="text-muted small">Não tem conta?</span>
                                                            <span class="text-primary fw-bold d-block mt-1">
                                                                <i class="bi bi-person-plus-fill me-1"></i>Criar conta agora
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>

                                            <form id="register-form" data-auth-form="register" class="auth-form d-none flex-grow-1 d-flex flex-column">
                                                <div class="row g-3 flex-grow-1">
                                                    <div class="col-md-6">
                                                        <label for="register-name" class="form-label-enhanced">
                                                            <i class="bi bi-person-fill text-primary"></i>Nome Completo *
                                                        </label>
                                                        <input type="text" class="form-control" id="register-name" placeholder="Seu nome completo" required style="background: #f8fafc;">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="register-email" class="form-label-enhanced">
                                                            <i class="bi bi-envelope-fill text-primary"></i>Email *
                                                        </label>
                                                        <input type="email" class="form-control" id="register-email" placeholder="seu@email.com" required style="background: #f8fafc;">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="register-password" class="form-label-enhanced">
                                                            <i class="bi bi-lock-fill text-primary"></i>Senha *
                                                        </label>
                                                        <input type="password" class="form-control" id="register-password" placeholder="Mínimo 6 caracteres" required minlength="6" style="background: #f8fafc;">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="register-confirm" class="form-label-enhanced">
                                                            <i class="bi bi-shield-check text-primary"></i>Confirmar Senha *
                                                        </label>
                                                        <input type="password" class="form-control" id="register-confirm" placeholder="Repita a senha" required style="background: #f8fafc;">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="register-role" class="form-label-enhanced">
                                                            <i class="bi bi-briefcase-fill text-primary"></i>Função
                                                        </label>
                                                        <select class="form-select" id="register-role" style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 12px 16px; border-radius: 12px;">
                                                            <option value="operator">👷 Operador</option>
                                                            <option value="supervisor">👔 Supervisor</option>
                                                            <option value="admin">⚙️ Administrador</option>
                                                            <option value="viewer">👁️ Visualizador</option>
                                                        </select>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="register-department" class="form-label-enhanced">
                                                            <i class="bi bi-building text-primary"></i>Departamento
                                                        </label>
                                                        <input type="text" class="form-control" id="register-department" placeholder="Ex: Engenharia" style="background: #f8fafc;">
                                                    </div>
                                                </div>
                                                <div class="mt-auto pt-3">
                                                    <button type="submit" class="btn w-100 auth-btn-primary" id="register-btn">
                                                        <i class="bi bi-person-check-fill me-2"></i>Criar Conta Agora
                                                    </button>
                                                    <div class="text-center mt-3 p-3 rounded-3" style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0;">
                                                        <button type="button" class="btn btn-link text-decoration-none p-0" data-auth-tab-trigger="login">
                                                            <span class="text-muted small">Já tem conta?</span>
                                                            <span class="text-primary fw-bold d-block mt-1">
                                                                <i class="bi bi-box-arrow-in-right me-1"></i>Fazer login
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function showAlert(message, type = 'info') {
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

    function setActiveTab(tab = 'login'){
        const tabs = document.querySelectorAll('[data-auth-tab]');
        const forms = document.querySelectorAll('[data-auth-form]');
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');

        tabs.forEach(button => {
            const isActive = button.dataset.authTab === tab;
            button.classList.toggle('auth-tab-active', isActive);
            button.classList.toggle('btn-outline-secondary', !isActive);
        });

        forms.forEach(form => {
            const isActive = form.dataset.authForm === tab;
            form.classList.toggle('d-none', !isActive);
        });

        if (title && subtitle) {
            if (tab === 'login') {
                title.textContent = 'Entrar';
                subtitle.textContent = 'Acesse o painel de controle';
            } else {
                title.textContent = 'Criar conta';
                subtitle.textContent = 'Registre-se para começar';
            }
        }
    }

    function bindCommonEvents(){
        document.querySelectorAll('[data-auth-tab]').forEach(button => {
            button.addEventListener('click', () => {
                setActiveTab(button.dataset.authTab || 'login');
            });
        });

        document.querySelectorAll('[data-auth-tab-trigger]').forEach(button => {
            button.addEventListener('click', () => {
                setActiveTab(button.dataset.authTabTrigger || 'login');
            });
        });

        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordField = document.getElementById('login-password');
                const icon = togglePassword.querySelector('i');
                if (!passwordField || !icon) return;
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.className = 'bi bi-eye-slash';
                } else {
                    passwordField.type = 'password';
                    icon.className = 'bi bi-eye';
                }
            });
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                const loginBtn = document.getElementById('login-btn');

                if (!email || !password) {
                    showAlert('Por favor, preencha todos os campos', 'warning');
                    return;
                }

                try {
                    loginBtn.disabled = true;
                    loginBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Entrando...';

                    const result = await AuthModel.login(email, password);
                    if (result.success) {
                        showAlert('Login realizado com sucesso!', 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 800);
                    }
                } catch (error) {
                    showAlert(error.message || 'Erro ao fazer login', 'danger');
                } finally {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Entrar';
                }
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('register-name').value.trim();
                const email = document.getElementById('register-email').value.trim();
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm').value;
                const role = document.getElementById('register-role').value;
                const department = document.getElementById('register-department').value.trim();
                const registerBtn = document.getElementById('register-btn');

                if (!name || !email || !password) {
                    showAlert('Por favor, preencha todos os campos obrigatórios', 'warning');
                    return;
                }

                if (password !== confirmPassword) {
                    showAlert('As senhas não coincidem', 'warning');
                    return;
                }

                if (password.length < 6) {
                    showAlert('A senha deve ter pelo menos 6 caracteres', 'warning');
                    return;
                }

                try {
                    registerBtn.disabled = true;
                    registerBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Criando conta...';

                    const userData = {
                        name,
                        email,
                        password,
                        role,
                        department: department || 'Geral'
                    };

                    const result = await AuthModel.register(userData);
                    if (result.success) {
                        showAlert('Conta criada com sucesso! Redirecionando...', 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 800);
                    }
                } catch (error) {
                    showAlert(error.message || 'Erro ao criar conta', 'danger');
                } finally {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Criar Conta';
                }
            });
        }
    }

    function renderMapPreview(zones = []) {
        const container = document.getElementById('auth-map-preview');
        const meta = document.getElementById('auth-map-meta');
        const zoneCount = document.getElementById('zone-count');
        if (!container) return;

        container.innerHTML = '';
        container.style.position = 'relative';
        
        // Grid sofisticado com perspectiva
        const grid = document.createElement('div');
        grid.style.position = 'absolute';
        grid.style.inset = '0';
        grid.style.backgroundImage = `
            repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.1) 0px, transparent 1px, transparent 30px, rgba(148, 163, 184, 0.1) 31px),
            repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.1) 0px, transparent 1px, transparent 30px, rgba(148, 163, 184, 0.1) 31px),
            radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.05), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05), transparent 40%)
        `;
        grid.style.backgroundSize = '30px 30px, 30px 30px, 100% 100%, 100% 100%';
        container.appendChild(grid);

        if (!zones.length) {
            zones = generateFallbackZones();
        }

        zones.forEach((zone, idx) => {
            const box = document.createElement('div');
            box.className = 'auth-map-zone';
            box.style.position = 'absolute';
            box.style.left = `${(zone.x || 0) * 100}%`;
            box.style.top = `${(zone.y || 0) * 100}%`;
            box.style.width = `${(zone.w || zone.width || 0.12) * 100}%`;
            box.style.height = `${(zone.h || zone.height || 0.12) * 100}%`;
            box.style.border = `3px solid ${zone.color || '#22d3ee'}`;
            box.style.background = `linear-gradient(135deg, ${zone.color || '#22d3ee'}20, ${zone.color || '#22d3ee'}08)`;
            box.style.borderRadius = '16px';
            box.style.boxShadow = `0 6px 24px ${zone.color || '#22d3ee'}35, inset 0 1px 0 rgba(255,255,255,0.15)`;
            box.style.backdropFilter = 'blur(8px)';
            box.style.cursor = 'pointer';

            const header = document.createElement('div');
            header.style.position = 'absolute';
            header.style.top = '10px';
            header.style.left = '10px';
            header.style.right = '10px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.gap = '8px';

            const label = document.createElement('div');
            label.style.fontWeight = '800';
            label.style.fontSize = '0.9rem';
            label.style.color = '#fff';
            label.style.textShadow = '0 2px 6px rgba(0,0,0,0.6)';
            label.style.background = `linear-gradient(135deg, ${zone.color || '#22d3ee'}, ${zone.color || '#22d3ee'}dd)`;
            label.style.padding = '6px 12px';
            label.style.borderRadius = '10px';
            label.style.boxShadow = `0 3px 10px ${zone.color || '#22d3ee'}50`;
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            
            const zoneIcon = zone.id.includes('Risco') ? 'exclamation-triangle-fill' : 
                            zone.id.includes('Armazém') ? 'box-seam-fill' :
                            zone.id.includes('Produção') ? 'gear-fill' :
                            zone.id.includes('Escritório') ? 'building' :
                            zone.id.includes('Estacionamento') ? 'car-front-fill' : 'geo-alt-fill';
            
            label.innerHTML = `<i class="bi bi-${zoneIcon}"></i>${zone.name || zone.id}`;

            const statusContainer = document.createElement('div');
            statusContainer.style.display = 'flex';
            statusContainer.style.alignItems = 'center';
            statusContainer.style.gap = '4px';
            
            const status = document.createElement('div');
            status.style.width = '12px';
            status.style.height = '12px';
            status.style.borderRadius = '50%';
            status.style.background = zone.id.includes('Risco') ? '#ef4444' : '#10b981';
            status.style.boxShadow = `0 0 12px ${zone.id.includes('Risco') ? '#ef4444' : '#10b981'}`;
            status.style.animation = 'pulse 2s infinite';
            
            statusContainer.appendChild(status);

            header.appendChild(label);
            header.appendChild(statusContainer);
            box.appendChild(header);

            // Info adicional
            const info = document.createElement('div');
            info.style.position = 'absolute';
            info.style.bottom = '10px';
            info.style.left = '10px';
            info.style.right = '10px';
            info.style.display = 'flex';
            info.style.justifyContent = 'space-between';
            info.style.alignItems = 'center';
            
            const sensorIcon = document.createElement('div');
            const sensorIcons = ['broadcast-pin', 'wifi', 'radar'];
            sensorIcon.innerHTML = `<i class="bi bi-${sensorIcons[idx % 3]}"></i>`;
            sensorIcon.style.color = zone.color || '#22d3ee';
            sensorIcon.style.fontSize = '1.3rem';
            sensorIcon.style.textShadow = '0 2px 6px rgba(0,0,0,0.4)';
            sensorIcon.style.filter = 'drop-shadow(0 0 8px currentColor)';
            
            const deviceCount = document.createElement('div');
            deviceCount.style.background = 'rgba(0,0,0,0.4)';
            deviceCount.style.color = '#fff';
            deviceCount.style.padding = '4px 8px';
            deviceCount.style.borderRadius = '8px';
            deviceCount.style.fontSize = '0.75rem';
            deviceCount.style.fontWeight = '700';
            deviceCount.style.backdropFilter = 'blur(4px)';
            deviceCount.innerHTML = `<i class="bi bi-cpu"></i> ${Math.floor(Math.random() * 5) + 1} IoT`;
            
            info.appendChild(sensorIcon);
            info.appendChild(deviceCount);
            box.appendChild(info);

            container.appendChild(box);
        });

        if (meta) {
            meta.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i><span class="fw-semibold">Backend conectado</span>`;
        }
        if (zoneCount) {
            zoneCount.innerHTML = `<span class="fw-bold">${zones.length}</span> zona${zones.length !== 1 ? 's' : ''}`;
        }
    }

    async function initMapPreview() {
        const placeholder = document.getElementById('auth-map-preview-placeholder');
        const meta = document.getElementById('auth-map-meta');
        try {
            const zones = await AreasModel.loadAreas();
            if (placeholder) placeholder.remove();
            renderMapPreview(Array.isArray(zones) ? zones : []);
        } catch (error) {
            console.error('Erro ao carregar preview do mapa:', error);
            if (placeholder) {
                placeholder.innerHTML = '<div class="text-center text-white-50">Erro ao carregar zonas</div>';
            }
            if (meta) {
                meta.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i><span>Erro ao buscar zonas</span>`;
            }
            renderMapPreview([]);
        }
    }

    function generateFallbackZones() {
        const zones = [
            { id: 'Z1', name: 'Armazém', x: 0.05, y: 0.08, w: 0.25, h: 0.35, color: '#06b6d4' },
            { id: 'Z2', name: 'Produção', x: 0.35, y: 0.08, w: 0.28, h: 0.35, color: '#8b5cf6' },
            { id: 'Z3', name: 'Expedição', x: 0.68, y: 0.08, w: 0.27, h: 0.35, color: '#10b981' },
            { id: 'Z4', name: 'Escritório', x: 0.05, y: 0.50, w: 0.20, h: 0.42, color: '#f59e0b' },
            { id: 'Z5', name: 'Zona Risco', x: 0.30, y: 0.50, w: 0.33, h: 0.20, color: '#ef4444' },
            { id: 'Z6', name: 'Estacionamento', x: 0.68, y: 0.50, w: 0.27, h: 0.42, color: '#6366f1' }
        ];
        return zones;
    }

    function render(defaultTab = 'login'){
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        root.innerHTML = template();
        bindCommonEvents();
        setActiveTab(defaultTab);
        hideChrome();
        initMapPreview();
    }

    return {
        renderLogin: () => render('login'),
        renderRegister: () => render('register')
    };
})();