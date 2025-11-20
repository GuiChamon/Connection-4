// js/models/areasModel.js
// NOVO SISTEMA - Busca áreas do backend MongoDB
const AreasModel = (function(){
    const API_URL = 'http://localhost:3000/api/zones';
    let cachedAreas = [];
    let loading = false;

    // Buscar áreas do backend
    async function loadAreas() {
        console.log('🔄 loadAreas() chamado');
        if (loading) {
            console.log('⏳ Já está carregando, retornando cache');
            return cachedAreas;
        }
        loading = true;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('⚠️ Token não encontrado. Aguardando autenticação...');
                loading = false;
                return [];
            }

            const response = await fetch(API_URL, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ Erro ao carregar áreas: HTTP ${response.status}`);
                loading = false;
                return [];
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('📦 Dados brutos do backend:', result.data);
                
                cachedAreas = result.data.map(zone => {
                    console.log(`🔍 Zona "${zone.name}": currentlyActive=${zone.currentlyActive}, connectionStatus=${zone.connectionStatus}`);
                    return {
                        id: zone.id,
                        name: zone.name,
                        x: zone.x,
                        y: zone.y,
                        w: zone.width,
                        h: zone.height,
                        color: zone.color || '#28a745',
                        icon: zone.icon || '📍',
                        isRiskZone: zone.isRiskZone || false,
                        deviceId: zone.deviceId,
                        description: zone.description,
                        currentlyActive: zone.currentlyActive,
                        connectionStatus: zone.connectionStatus,
                        lastConnection: zone.lastConnection
                    };
                });
                console.log(`✅ ${cachedAreas.length} áreas carregadas do backend`);
                console.log('📦 Áreas processadas:', cachedAreas);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar áreas:', error);
            cachedAreas = [];
        } finally {
            loading = false;
        }

        return cachedAreas;
    }

    // Retorna áreas (cache ou carrega se vazio)
    function getAreas(){
        console.log('🔍 getAreas() chamado - cache length:', cachedAreas.length);
        if (cachedAreas.length === 0 && !loading) {
            // Retornar Promise para permitir await
            return loadAreas();
        }
        console.log('📦 Retornando cache:', cachedAreas);
        return cachedAreas;
    }

    function getAreaById(id){
        return cachedAreas.find(a => a.id === id) || null;
    }
    
    function getRiskAreas(){
        return cachedAreas.filter(a => a.isRiskZone === true);
    }

    // Forçar recarregar áreas
    function refreshAreas() {
        cachedAreas = [];
        return loadAreas();
    }

    // NÃO inicializar automaticamente - esperar token

    return {
        getAreas,
        getAreaById,
        getRiskAreas,
        refreshAreas,
        loadAreas
    };
})();
