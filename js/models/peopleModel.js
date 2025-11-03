// js/models/peopleModel.js - VERSÃO COM API REST
const PeopleModel = (function(){
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
            const result = await apiRequest(`${API_BASE}/people`);
            return result.data || [];
        } catch (error) {
            console.error('Erro ao buscar pessoas:', error);
            return [];
        }
    }

    async function find(id){
        try {
            const result = await apiRequest(`${API_BASE}/people/${id}`);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar pessoa:', error);
            return null;
        }
    }

    async function findByDevice(deviceId){
        try {
            const result = await apiRequest(`${API_BASE}/people/device/${deviceId}`);
            return result.data;
        } catch (error) {
            console.error('Erro ao buscar pessoa por dispositivo:', error);
            return null;
        }
    }

    async function add(personData){
        try {
            const result = await apiRequest(`${API_BASE}/people`, {
                method: 'POST',
                body: JSON.stringify(personData)
            });
            return result.data._id;
        } catch (error) {
            console.error('Erro ao adicionar pessoa:', error);
            throw error;
        }
    }

    async function update(id, updates){
        try {
            const result = await apiRequest(`${API_BASE}/people/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            return true;
        } catch (error) {
            console.error('Erro ao atualizar pessoa:', error);
            return false;
        }
    }

    async function remove(id){
        try {
            await apiRequest(`${API_BASE}/people/${id}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('Erro ao remover pessoa:', error);
            return false;
        }
    }
    return {
        all,
        find,
        findByDevice,
        add,
        update,
        remove
    };
})();