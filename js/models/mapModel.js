// js/models/mapModel.js - VERSÃO COM API REST
const MapModel = (function(){
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

    async function loadZones(){
        try {
            const result = await apiRequest(`${API_BASE}/zones`);
            if (result.data && result.data.length > 0) {
                return result.data;
            }
            
            // Retornar array vazio - cadastre zonas manualmente
            console.log('ℹ️ Nenhuma zona cadastrada. Cadastre zonas através da interface web.');
            return [];
        } catch (error) {
            console.error('Erro ao carregar zonas:', error);
            return [];
        }
    }

    async function getDevicePositions(){
        try {
            const result = await apiRequest(`${API_BASE}/positions`);
            const positions = {};
            
            if (result.data) {
                result.data.forEach(pos => {
                    positions[pos.deviceId] = { x: pos.x, y: pos.y };
                });
            }
            
            return positions;
        } catch (error) {
            console.error('Erro ao buscar posições:', error);
            return {};
        }
    }

    async function setDevicePosition(deviceId, x, y){
        try {
            // Verificar se é sensor fixo - não permitir movimento
            if (deviceId.includes('SENSOR_') || deviceId.startsWith('S0')) {
                const device = DevicesModel.find(deviceId);
                if (device && device.type === 'sensor') {
                    console.warn(`🔒 Tentativa de mover sensor fixo ${deviceId} bloqueada!`);
                    return false;
                }
            }
            
            await apiRequest(`${API_BASE}/positions`, {
                method: 'POST',
                body: JSON.stringify({ deviceId, x, y })
            });
            return true;
        } catch (error) {
            console.error('Erro ao definir posição via API, usando localStorage:', error);
            
            // Fallback para localStorage
            return setDevicePositionLocal(deviceId, x, y);
        }
    }

    function setDevicePositionLocal(deviceId, x, y) {
        // Verificar se é sensor fixo - não permitir movimento
        if (deviceId.includes('SENSOR_') || deviceId.startsWith('S0')) {
            const device = DevicesModel.find(deviceId);
            if (device && device.type === 'sensor') {
                console.warn(`🔒 Tentativa de mover sensor fixo ${deviceId} bloqueada (localStorage)!`);
                return false;
            }
        }
        
        const positions = JSON.parse(localStorage.getItem('device_positions') || '{}');
        positions[deviceId] = { x, y };
        localStorage.setItem('device_positions', JSON.stringify(positions));
        return true;
    }

    async function resetDevicePositions(){
        try {
            await apiRequest(`${API_BASE}/positions`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('Erro ao resetar posições:', error);
            return false;
        }
    }

    function pointInZone(x, y, zone){
        // Suporta tanto polígonos quanto círculos
        if (zone.coordinates && zone.coordinates.length > 0) {
            // Zona tipo polígono - usar algoritmo ray-casting
            return pointInPolygon(x, y, zone.coordinates);
        } else if (zone.r) {
            // Zona tipo círculo (compatibilidade antiga)
            const dx = x - zone.x;
            const dy = y - zone.y;
            return Math.sqrt(dx*dx + dy*dy) <= zone.r;
        }
        return false;
    }

    function pointInPolygon(x, y, vertices) {
        // Algoritmo Ray-casting para verificar se ponto está dentro do polígono
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    return {
        loadZones,
        getDevicePositions,
        setDevicePosition,
        setDevicePositionLocal,
        resetDevicePositions,
        pointInZone,
        pointInPolygon
    };
})();