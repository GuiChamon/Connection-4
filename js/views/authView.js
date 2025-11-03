// js/views/authView.js - Interface de Login e Registro
const AuthView = (function(){
    const root = document.getElementById('view-root');

    function loginTemplate(){
        return `
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card shadow-lg border-0">
                    <div class="card-header text-center">
                        <h4 class="card-title mb-0 text-white">
                            <i class="bi bi-shield-lock me-2"></i>Login no Sistema
                        </h4>
                    </div>
                    <div class="card-body p-4">
                        <div id="auth-alerts"></div>
                        
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="login-email" class="form-label">Email</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                    <input type="email" class="form-control" id="login-email" placeholder="seu@email.com" required>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="login-password" class="form-label">Senha</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                    <input type="password" class="form-control" id="login-password" placeholder="Digite sua senha" required>
                                    <button class="btn btn-outline-secondary" type="button" id="toggle-password">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2 mb-3">
                                <button type="submit" class="btn btn-primary" id="login-btn">
                                    <i class="bi bi-check-lg me-2"></i>Entrar
                                </button>
                            </div>
                        </form>
                        
                        <hr>
                        
                        <div class="text-center">
                            <p class="mb-2">Não tem uma conta?</p>
                            <button class="btn btn-outline-primary" id="show-register">
                                <i class="bi bi-person-plus me-2"></i>Criar Conta
                            </button>
                        </div>
                    </div>
                    <div class="card-footer text-center text-muted small">
                        Sistema de Monitoramento de Segurança
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function registerTemplate(){
        return `
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card shadow-lg border-0">
                    <div class="card-header text-center">
                        <h4 class="card-title mb-0 text-white">
                            <i class="bi bi-person-plus me-2"></i>Registrar Nova Conta
                        </h4>
                    </div>
                    <div class="card-body p-4">
                        <div id="auth-alerts"></div>
                        
                        <form id="register-form">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="register-name" class="form-label">Nome Completo *</label>
                                    <input type="text" class="form-control" id="register-name" placeholder="Seu nome completo" required>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label for="register-email" class="form-label">Email *</label>
                                    <input type="email" class="form-control" id="register-email" placeholder="seu@email.com" required>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="register-password" class="form-label">Senha *</label>
                                    <input type="password" class="form-control" id="register-password" placeholder="Mínimo 6 caracteres" required minlength="6">
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label for="register-confirm" class="form-label">Confirmar Senha *</label>
                                    <input type="password" class="form-control" id="register-confirm" placeholder="Repita a senha" required>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="register-role" class="form-label">Função</label>
                                    <select class="form-select" id="register-role">
                                        <option value="operator">Operador</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="admin">Administrador</option>
                                        <option value="viewer">Visualizador</option>
                                    </select>
                                </div>
                                
                                <div class="col-md-6 mb-3">
                                    <label for="register-department" class="form-label">Departamento</label>
                                    <input type="text" class="form-control" id="register-department" placeholder="Ex: Engenharia, Segurança">
                                </div>
                            </div>
                            
                            <div class="d-grid gap-2 mb-3">
                                <button type="submit" class="btn btn-primary" id="register-btn">
                                    <i class="bi bi-check-lg me-2"></i>Criar Conta
                                </button>
                            </div>
                        </form>
                        
                        <hr>
                        
                        <div class="text-center">
                            <p class="mb-2">Já tem uma conta?</p>
                            <button class="btn btn-outline-primary" id="show-login">
                                <i class="bi bi-box-arrow-in-right me-2"></i>Fazer Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function showAlert(message, type = 'info') {
        const alertsContainer = document.getElementById('auth-alerts');
        if (!alertsContainer) return;

        const alertClass = {
            success: 'alert-success',
            danger: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        }[type] || 'alert-info';

        const icon = {
            success: 'bi-check-circle',
            danger: 'bi-exclamation-triangle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        }[type] || 'bi-info-circle';

        alertsContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="${icon} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-remove após 5 segundos
        setTimeout(() => {
            const alert = alertsContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    function bindLoginEvents() {
        // Toggle de mostrar/ocultar senha
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordField = document.getElementById('login-password');
                const icon = togglePassword.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.className = 'bi bi-eye-slash';
                } else {
                    passwordField.type = 'password';
                    icon.className = 'bi bi-eye';
                }
            });
        }

        // Form de login
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
                        
                        // Redirecionar após 1 segundo
                        setTimeout(() => {
                            window.location.reload(); // Recarregar para mostrar sistema principal
                        }, 1000);
                    }
                    
                } catch (error) {
                    showAlert(error.message || 'Erro ao fazer login', 'danger');
                } finally {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Entrar';
                }
            });
        }

        // Botão para mostrar registro
        const showRegisterBtn = document.getElementById('show-register');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                renderRegister();
            });
        }
    }

    function bindRegisterEvents() {
        // Form de registro
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
                
                // Validações
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
                        
                        // Redirecionar após 1 segundo
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                    
                } catch (error) {
                    showAlert(error.message || 'Erro ao criar conta', 'danger');
                } finally {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Criar Conta';
                }
            });
        }

        // Botão para mostrar login
        const showLoginBtn = document.getElementById('show-login');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                renderLogin();
            });
        }
    }

    function renderLogin() {
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = loginTemplate();
        bindLoginEvents();
    }

    function renderRegister() {
        if (!root) {
            console.error('Elemento view-root não encontrado');
            return;
        }
        
        root.innerHTML = registerTemplate();
        bindRegisterEvents();
    }

    return {
        renderLogin,
        renderRegister
    };
})();