// js/models/accessControlModel.js
// Sistema de Controle de Acesso às Áreas do Canteiro

const AccessControlModel = (function() {
    
    // Definir permissões de acesso por área
    const areaPermissions = {
        // Áreas de Risco - Acesso Restrito
        'zona_perigo_1': {
            name: 'Área de Guindastes',
            restricted: true,
            authorizedRoles: [
                'Operador de Guindaste',
                'Guincheiro',
                'Operador de Torre',
                'Engenheiro',
                'Engenheira Civil',
                'Engenheiro de Segurança',
                'Técnico de Segurança',
                'Supervisor'
            ],
            riskLevel: 'ALTO'
        },
        
        'zona_perigo_2': {
            name: 'Área de Soldas',
            restricted: true,
            authorizedRoles: [
                'Soldador',
                'Soldadora',
                'Auxiliar de Solda',
                'Engenheiro',
                'Engenheira Civil',
                'Engenheiro de Segurança',
                'Técnico de Segurança',
                'Supervisor'
            ],
            riskLevel: 'ALTO'
        },
        
        // Áreas Produtivas - Acesso Controlado
        'area_construcao': {
            name: 'Construção Principal',
            restricted: false,
            authorizedRoles: [
                'Pedreiro',
                'Servente',
                'Armador',
                'Carpinteiro',
                'Encarregado',
                'Engenheiro',
                'Engenheira Civil',
                'Mestre de Obras',
                'Supervisor'
            ],
            riskLevel: 'MÉDIO'
        },
        
        'oficina': {
            name: 'Oficina Mecânica',
            restricted: false,
            authorizedRoles: [
                'Mecânico',
                'Eletricista',
                'Técnico de Manutenção',
                'Auxiliar de Manutenção',
                'Engenheiro',
                'Supervisor'
            ],
            riskLevel: 'MÉDIO'
        },
        
        'betoneira': {
            name: 'Central de Concreto',
            restricted: false,
            authorizedRoles: [
                'Operador de Betoneira',
                'Operador de Bomba',
                'Motorista',
                'Engenheiro',
                'Técnico em Qualidade',
                'Supervisor'
            ],
            riskLevel: 'MÉDIO'
        },
        
        // Áreas Administrativas - Acesso Livre
        'entrada': {
            name: 'Portaria Principal',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'escritorio': {
            name: 'Escritório de Obras',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'almoxarifado': {
            name: 'Almoxarifado Geral',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'deposito': {
            name: 'Depósito Material',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'estacionamento': {
            name: 'Estacionamento',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        // Áreas Sociais - Acesso Livre
        'refeitorio': {
            name: 'Refeitório',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'enfermaria': {
            name: 'Enfermaria',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'vestiario_masc': {
            name: 'Vestiário Masculino',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'vestiario_fem': {
            name: 'Vestiário Feminino',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'limpeza': {
            name: 'Área de Limpeza',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'manutencao': {
            name: 'Manutenção',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'guarita': {
            name: 'Guarita Saída',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        },
        
        'laboratorio': {
            name: 'Lab. Qualidade',
            restricted: false,
            authorizedRoles: ['Todos'],
            riskLevel: 'BAIXO'
        }
    };
    
    // Armazenar alertas de acesso não autorizado
    let accessAlerts = [];
    
    /**
     * Verifica se um colaborador tem permissão para acessar uma área
     * @param {string} role - Função/cargo do colaborador
     * @param {string} areaId - ID da área
     * @returns {object} - {authorized: boolean, reason: string, riskLevel: string}
     */
    function checkAccess(role, areaId) {
        const areaPermission = areaPermissions[areaId];
        
        if (!areaPermission) {
            return {
                authorized: true,
                reason: 'Área não mapeada no sistema de controle',
                riskLevel: 'DESCONHECIDO'
            };
        }
        
        // Se a área permite "Todos", está autorizado
        if (areaPermission.authorizedRoles.includes('Todos')) {
            return {
                authorized: true,
                reason: 'Área de acesso livre',
                riskLevel: areaPermission.riskLevel,
                areaName: areaPermission.name
            };
        }
        
        // Verificar se o cargo está na lista de autorizados
        const isAuthorized = areaPermission.authorizedRoles.some(authorizedRole => 
            role.toLowerCase().includes(authorizedRole.toLowerCase()) ||
            authorizedRole.toLowerCase().includes(role.toLowerCase())
        );
        
        return {
            authorized: isAuthorized,
            reason: isAuthorized 
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
