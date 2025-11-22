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
    
    const baseAreaPermissions = {
        zona_perigo_1: {
            name: 'Área de Guindastes',
            riskLevel: 'ALTO',
            restricted: true,
            allowedRoles: [
                'Operador de Guindaste','Operadora de Guindaste','Guincheiro','Operador de Torre',
                'Engenheiro','Engenheira Civil','Engenheiro de Segurança','Técnico de Segurança',
                'Supervisor','Supervisora'
            ]
        },
        zona_perigo_2: {
            name: 'Área de Soldas',
            riskLevel: 'ALTO',
            restricted: true,
            allowedRoles: [
                'Soldador','Soldadora','Auxiliar de Solda','Engenheiro','Engenheira Civil',
                'Engenheiro de Segurança','Técnico de Segurança','Supervisor','Supervisora'
            ]
        },
        area_construcao: {
            name: 'Construção Principal',
            riskLevel: 'MÉDIO',
            restricted: false,
            allowedRoles: [
                'Pedreiro','Servente','Armador','Armadora','Carpinteiro','Carpinteira','Encarregado','Encarregada',
                'Engenheiro','Engenheira Civil','Mestre de Obras','Supervisor','Supervisora','Técnico de Segurança'
            ]
        },
        oficina: {
            name: 'Oficina Mecânica',
            riskLevel: 'MÉDIO',
            restricted: false,
            allowedRoles: [
                'Mecânico','Mecânica','Eletricista','Técnico de Manutenção','Técnica de Manutenção',
                'Auxiliar de Manutenção','Engenheiro','Engenheira Civil','Supervisor','Supervisora'
            ]
        },
        betoneira: {
            name: 'Central de Concreto',
            riskLevel: 'MÉDIO',
            restricted: false,
            allowedRoles: [
                'Operador de Betoneira','Operadora de Betoneira','Operador de Bomba','Operadora de Bomba','Motorista',
                'Engenheiro','Engenheira Civil','Técnico em Qualidade','Técnica em Qualidade','Supervisor','Supervisora'
            ]
        },
        entrada: { name: 'Portaria Principal', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        escritorio: { name: 'Escritório de Obras', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        almoxarifado: { name: 'Almoxarifado Geral', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        estacionamento: { name: 'Estacionamento', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        deposito: { name: 'Depósito Material', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        refeitorio: { name: 'Refeitório', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        enfermaria: { name: 'Enfermaria', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        laboratorio: { name: 'Laboratório de Qualidade', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        vestiario_masc: { name: 'Vestiário Masculino', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        vestiario_fem: { name: 'Vestiário Feminino', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        limpeza: { name: 'Área de Limpeza', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        manutencao: { name: 'Manutenção', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' },
        guarita: { name: 'Guarita Saída', riskLevel: 'BAIXO', restricted: false, allowedRoles: '*' }
    };

    const areaPermissions = {
        ...baseAreaPermissions,
        risco1: { ...baseAreaPermissions['zona_perigo_1'], name: 'Área de Risco 1' },
        risco2: { ...baseAreaPermissions['zona_perigo_2'], name: 'Área de Risco 2' }
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
        
        if (areaPermission.allowedRoles === '*' || (Array.isArray(areaPermission.allowedRoles) && areaPermission.allowedRoles.includes('*'))) {
            return {
                authorized: true,
                reason: 'Área de acesso livre',
                riskLevel: areaPermission.riskLevel,
                areaName: areaPermission.name
            };
        }
        
        const isAuthorizedByRole = Array.isArray(areaPermission.allowedRoles) && areaPermission.allowedRoles.some(allowedRole => 
            role.toLowerCase().includes(allowedRole.toLowerCase()) ||
            allowedRole.toLowerCase().includes(role.toLowerCase())
        );
        
        return {
            authorized: isAuthorizedByRole,
            reason: isAuthorizedByRole 
                ? 'Colaborador autorizado para esta área'
                : `Acesso não autorizado! Apenas: ${Array.isArray(areaPermission.allowedRoles) ? areaPermission.allowedRoles.join(', ') : 'perfis específicos'}`,
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
