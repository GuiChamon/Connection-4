// js/models/accessControlModel.js
// Sistema de Controle de Acesso às Áreas do Canteiro

const AccessControlModel = (function() {
    const COMMON_AREAS = [
        'entrada','escritorio','almoxarifado','deposito','estacionamento','refeitorio',
        'enfermaria','vestiario_masc','vestiario_fem','limpeza','manutencao','guarita',
        'laboratorio','area_construcao','oficina','betoneira'
    ];
    const RISK1_AREAS = ['zona_perigo_1','risco1'];
    const RISK2_AREAS = ['zona_perigo_2','risco2'];

    const LEVEL_RULES = {
        1: {
            name: 'Nível 1',
            description: 'Portaria e áreas comuns',
            allowedAreas: COMMON_AREAS
        },
        2: {
            name: 'Nível 2',
            description: 'Comuns + Área de Risco 1',
            allowedAreas: [...COMMON_AREAS, ...RISK1_AREAS]
        },
        3: {
            name: 'Nível 3',
            description: 'Acesso total',
            allowedAreas: ['*']
        }
    };
    
  
    
    function hasLevelAccess(accessLevel = 1, areaId) {
        if (!areaId) return false;
        const rule = LEVEL_RULES[accessLevel] || LEVEL_RULES[1];
        if (!rule) return false;
        if (rule.allowedAreas.includes('*')) return true;
        return rule.allowedAreas.includes(areaId);
    }

    function normalizePerson(input) {
        if (typeof input === 'object' && input !== null) {
            return {
                role: input.role || '',
                accessLevel: Number(input.accessLevel) || 1
            };
        }
        return {
            role: input || '',
            accessLevel: 1
        };
    }

    // Armazenar alertas de acesso não autorizado
    let accessAlerts = [];
    
    /**
     * Verifica se um colaborador tem permissão para acessar uma área
     * @param {string} role - Função/cargo do colaborador
     * @param {string} areaId - ID da área
     * @returns {object} - {authorized: boolean, reason: string, riskLevel: string}
     */
    function checkAccess(personOrRole, areaId) {
        const { role, accessLevel } = normalizePerson(personOrRole);
        const areaPermission = areaPermissions[areaId];

        if (!areaPermission) {
            return {
                authorized: true,
                reason: 'Área não mapeada no sistema de controle',
                riskLevel: 'DESCONHECIDO'
            };
        }

        if (hasLevelAccess(accessLevel, areaId)) {
            return {
                authorized: true,
                reason: `${LEVEL_RULES[accessLevel]?.name || 'Nível 1'} autorizado`,
                riskLevel: areaPermission.riskLevel,
                areaName: areaPermission.name,
                restricted: areaPermission.restricted
            };
        }
        
        if (areaPermission.authorizedRoles.includes('Todos')) {
            return {
                authorized: true,
                reason: 'Área de acesso livre',
                riskLevel: areaPermission.riskLevel,
                areaName: areaPermission.name
            };
        }
        
        const isAuthorizedByRole = areaPermission.authorizedRoles.some(authorizedRole => 
            role.toLowerCase().includes(authorizedRole.toLowerCase()) ||
            authorizedRole.toLowerCase().includes(role.toLowerCase())
        );
        
        return {
            authorized: isAuthorizedByRole,
            reason: isAuthorizedByRole 
                ? 'Colaborador autorizado para esta área'
                : `Acesso não autorizado! Apenas: ${areaPermission.authorizedRoles.join(', ')}`,
            riskLevel: areaPermission.riskLevel,
            areaName: areaPermission.name,
            restricted: areaPermission.restricted
        };
    }
    
    /**
     * Registra um alerta de acesso não autorizado
     * @param {object} alert - Dados do alerta
     */
    function registerAlert(alert) {
        const alertData = {
            id: `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...alert
        };
        
        accessAlerts.unshift(alertData); // Adicionar no início
        
        // Manter apenas os últimos 50 alertas
        if (accessAlerts.length > 50) {
            accessAlerts = accessAlerts.slice(0, 50);
        }
        
        console.warn('🚨 ALERTA DE ACESSO:', alertData);
        
        return alertData;
    }
    
    /**
     * Obtém todos os alertas de acesso
     * @returns {array} - Lista de alertas
     */
    function getAlerts() {
        return accessAlerts;
    }
    
    /**
     * Limpa alertas antigos (mais de 1 hora)
     */
    function clearOldAlerts() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        accessAlerts = accessAlerts.filter(alert => {
            const alertTime = new Date(alert.timestamp).getTime();
            return alertTime > oneHourAgo;
        });
    }
    
    /**
     * Obtém informações de permissão de uma área
     * @param {string} areaId - ID da área
     * @returns {object} - Dados da permissão
     */
    function getAreaPermissions(areaId) {
        return areaPermissions[areaId] || null;
    }
    
    /**
     * Lista todas as áreas restritas
     * @returns {array} - Lista de áreas restritas
     */
    function getRestrictedAreas() {
        return Object.entries(areaPermissions)
            .filter(([id, permission]) => permission.restricted)
            .map(([id, permission]) => ({
                id,
                ...permission
            }));
    }
    
    /**
     * Verifica se um colaborador pode acessar áreas de risco
     * @param {string} role - Função do colaborador
     * @returns {object} - Áreas de risco acessíveis
     */
    function getRiskAreasAccess(role) {
        const restrictedAreas = getRestrictedAreas();
        return restrictedAreas.map(area => ({
            ...area,
            hasAccess: checkAccess(role, area.id).authorized
        }));
    }
    
    // Limpar alertas antigos a cada 10 minutos
    setInterval(clearOldAlerts, 10 * 60 * 1000);
    
    return {
        checkAccess,
        registerAlert,
        getAlerts,
        getAreaPermissions,
        getRestrictedAreas,
        getRiskAreasAccess
    };
})();
