// js/models/authModel.js - Modelo de Autenticação
const AuthModel = (function(){
    const API_BASE = 'http://localhost:3000/api';
    const TOKEN_KEY = 'connection4_token';
    const USER_KEY = 'connection4_user';

    // Função auxiliar para fazer requisições
    async function apiRequest(url, options = {}) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Adicionar token se disponível
            const token = getToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                headers,
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    // Salvar token e dados do usuário
    function saveAuthData(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    // Obter token
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    // Obter dados do usuário
    function getUser() {
        const userData = localStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }

    // Limpar dados de autenticação
    function clearAuthData() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    // Verificar se está logado
    function isAuthenticated() {
        return !!getToken();
    }

    // Registrar novo usuário
    async function register(userData) {
        try {
            const result = await apiRequest(`${API_BASE}/auth/register`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (result.success) {
                saveAuthData(result.data.token, result.data.user);
            }

            return result;
        } catch (error) {
            console.error('Erro no registro:', error);
            throw error;
        }
    }

    // Login do usuário
    async function login(email, password) {
        try {
            const result = await apiRequest(`${API_BASE}/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (result.success) {
                saveAuthData(result.data.token, result.data.user);
            }

            return result;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    // Logout
    async function logout() {
        try {
            // Chamar API de logout (opcional)
            await apiRequest(`${API_BASE}/auth/logout`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Erro ao fazer logout na API:', error);
        } finally {
            // Sempre limpar dados locais
            clearAuthData();
        }
    }

    // Verificar token
    async function verifyToken() {
        try {
            const result = await apiRequest(`${API_BASE}/auth/verify`, {
                method: 'POST'
            });
            return result.success;
        } catch (error) {
            console.error('Token inválido:', error);
            clearAuthData();
            return false;
        }
    }

    // Obter dados atuais do usuário
    async function getCurrentUser() {
        try {
            const result = await apiRequest(`${API_BASE}/auth/me`);
            if (result.success) {
                // Atualizar dados locais
                const currentToken = getToken();
                saveAuthData(currentToken, result.data);
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Erro ao obter usuário atual:', error);
            return null;
        }
    }

    // Verificar permissão do usuário
    function hasPermission(requiredRole) {
        const user = getUser();
        if (!user) return false;

        const roles = {
            'viewer': 1,
            'operator': 2,
            'supervisor': 3,
            'admin': 4
        };

        return roles[user.role] >= roles[requiredRole];
    }

    return {
        register,
        login,
        logout,
        verifyToken,
        getCurrentUser,
        getToken,
        getUser,
        isAuthenticated,
        hasPermission,
        clearAuthData
    };
})();