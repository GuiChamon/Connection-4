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
            
            // Criar zonas padrão se não existirem - ALINHADAS com novas posições dos sensores
            const defaultZones = [
                // Área de Guindastes: Sensor em (0.42, 0.08)
                { id: 'z1', name: 'Área de Guindastes', x: 0.42, y: 0.08, r: 0.08 },
                
                // Área de Soldas: Sensor em (0.44, 0.30)
                { id: 'z2', name: 'Área de Soldas', x: 0.44, y: 0.30, r: 0.09 }
            ];
            
            for (const zone of defaultZones) {
                try {
                    await apiRequest(`${API_BASE}/zones`, {
                        method: 'POST',
                        body: JSON.stringify(zone)
                    });
                } catch (error) {
                    console.warn('Zona já existe:', zone.id);
                }
            }
            
            return defaultZones;
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
        const dx = x - zone.x;
        const dy = y - zone.y;
        return Math.sqrt(dx*dx + dy*dy) <= zone.r;
    }

    return {
        loadZones,
        getDevicePositions,
        setDevicePosition,
        setDevicePositionLocal,
        resetDevicePositions,
        pointInZone
    };
})();