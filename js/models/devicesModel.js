// js/models/devicesModel.js - VERSÃO COM API REST
const DevicesModel = (function(){
    const API_BASE = 'http://localhost:3000/api';

    // Função auxiliar para fazer requisições
    async function apiRequest(url, options = {}) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Adicionar token de autenticação
            const token = AuthModel ? AuthModel.getToken() : null;
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                headers,
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Se erro 401, limpar autenticação
                if (response.status === 401 && AuthModel) {
                    AuthModel.clearAuthData();
                    window.location.reload();
                }
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    async function all(){
        try {
            console.log('🌐 [DevicesModel.all] Fazendo requisição GET /api/devices');
            const result = await apiRequest(`${API_BASE}/devices`);
            console.log('📡 [DevicesModel.all] Resposta recebida:', result);
            return result.data || [];
        } catch (error) {
            console.error('❌ [DevicesModel.all] Erro ao buscar dispositivos:', error);
            return [];
        }
    }

    async function find(id){
        try {
            const result = await apiRequest(`${API_BASE}/devices/${id}`);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar dispositivo:', error);
            return null;
        }
    }

    async function add(deviceData){
        try {
            const result = await apiRequest(`${API_BASE}/devices`, {
                method: 'POST',
                body: JSON.stringify(deviceData)
            });
            return result.data.id;
        } catch (error) {
            console.error('Erro ao adicionar dispositivo:', error);
            throw error;
        }
    }

    async function update(id, updates){
        try {
            const result = await apiRequest(`${API_BASE}/devices/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            return true;
        } catch (error) {
            console.error('Erro ao atualizar dispositivo:', error);
            return false;
        }
    }

    async function remove(id){
        try {
            await apiRequest(`${API_BASE}/devices/${id}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('Erro ao remover dispositivo:', error);
            return false;
        }
    }

    return { 
        all, 
        find, 
        add, 
        update, 
        remove 
    };
})();