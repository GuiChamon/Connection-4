/**
 * Middleware de Controle de Acesso
 * 
 * Define permissões de acesso às áreas baseado nas funções dos trabalhadores.
 * Integra com o sistema de alertas para monitorar acessos não autorizados.
 */

// Mapeamento de permissões por área
const areaPermissions = {
  // ZONAS DE ALTO RISCO - Acesso Restrito
  'zona_perigo_1': {
    name: 'Área de Guindastes',
    riskLevel: 'ALTO',
    restricted: true,
    allowedRoles: [
      'Operador de Guindaste',
      'Operadora de Guindaste',
      'Guincheiro',
      'Operador de Torre',
      'Engenheiro',
      'Engenheira Civil',
      'Engenheiro de Segurança',
      'Técnico de Segurança',
      'Supervisor',
      'Supervisora'
    ]
  },
  
  'zona_perigo_2': {
    name: 'Área de Soldas',
    riskLevel: 'ALTO',
    restricted: true,
    allowedRoles: [
      'Soldador',
      'Soldadora',
      'Auxiliar de Solda',
      'Engenheiro',
      'Engenheira Civil',
      'Engenheiro de Segurança',
      'Técnico de Segurança',
      'Supervisor',
      'Supervisora'
    ]
  },
  
  // ÁREAS CONTROLADAS - Acesso por Função
  'area_construcao': {
    name: 'Construção Principal',
    riskLevel: 'MÉDIO',
    restricted: false,
    allowedRoles: [
      'Pedreiro',
      'Servente',
      'Armador',
      'Armadora',
      'Carpinteiro',
      'Carpinteira',
      'Encarregado',
      'Encarregada',
      'Engenheiro',
      'Engenheira Civil',
      'Mestre de Obras',
      'Supervisor',
      'Supervisora',
      'Técnico de Segurança'
    ]
  },
  
  'oficina': {
    name: 'Oficina Mecânica',
    riskLevel: 'MÉDIO',
    restricted: false,
    allowedRoles: [
      'Mecânico',
      'Mecânica',
      'Eletricista',
      'Técnico de Manutenção',
      'Técnica de Manutenção',
      'Auxiliar de Manutenção',
      'Engenheiro',
      'Engenheira Civil',
      'Supervisor',
      'Supervisora'
    ]
  },
  
  'betoneira': {
    name: 'Central de Concreto',
    riskLevel: 'MÉDIO',
    restricted: false,
    allowedRoles: [
      'Operador de Betoneira',
      'Operadora de Betoneira',
      'Operador de Bomba',
      'Operadora de Bomba',
      'Motorista',
      'Engenheiro',
      'Engenheira Civil',
      'Técnico em Qualidade',
      'Técnica em Qualidade',
      'Supervisor',
      'Supervisora'
    ]
  },
  
  // ÁREAS LIVRES - Acesso para Todos
  'entrada': {
    name: 'Portaria Principal',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*' // Todos podem acessar
  },
  
  'escritorio': {
    name: 'Escritório de Obras',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'almoxarifado': {
    name: 'Almoxarifado Geral',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'estacionamento': {
    name: 'Estacionamento',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'deposito': {
    name: 'Depósito Material',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'refeitorio': {
    name: 'Refeitório',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'enfermaria': {
    name: 'Enfermaria',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'laboratorio': {
    name: 'Laboratório de Qualidade',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'vestiario_masc': {
    name: 'Vestiário Masculino',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'vestiario_fem': {
    name: 'Vestiário Feminino',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'limpeza': {
    name: 'Área de Limpeza',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'manutencao': {
    name: 'Manutenção',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  },
  
  'guarita': {
    name: 'Guarita Saída',
    riskLevel: 'BAIXO',
    restricted: false,
    allowedRoles: '*'
  }
};

/**
 * Verifica se uma função tem permissão para acessar uma área
 * @param {string} role - Função do trabalhador
 * @param {string} areaId - ID da área
 * @returns {boolean} - true se autorizado, false caso contrário
 */
function checkAccess(role, areaId) {
  // Validar parâmetros
  if (!role || !areaId) {
    return false;
  }
  
  // Buscar configuração da área
  const area = areaPermissions[areaId];
  
  // Se área não está configurada, negar acesso por segurança
  if (!area) {
    console.warn(`⚠️ Área não configurada: ${areaId}`);
    return false;
  }
  
  // Se área permite acesso a todos
  if (area.allowedRoles === '*') {
    return true;
  }
  
  // Verificar se a função está na lista de permitidos
  const hasAccess = area.allowedRoles.includes(role);
  
  return hasAccess;
}

/**
 * Obter informações detalhadas de uma área
 * @param {string} areaId - ID da área
 * @returns {object|null} - Informações da área ou null
 */
function getAreaInfo(areaId) {
  return areaPermissions[areaId] || null;
}

/**
 * Listar todas as áreas restritas
 * @returns {array} - Array com IDs das áreas restritas
 */
function getRestrictedAreas() {
  return Object.keys(areaPermissions).filter(areaId => {
    return areaPermissions[areaId].restricted === true;
  });
}

/**
 * Listar todas as áreas que uma função pode acessar
 * @param {string} role - Função do trabalhador
 * @returns {array} - Array com IDs das áreas permitidas
 */
function getAllowedAreasForRole(role) {
  const allowedAreas = [];
  
  for (const [areaId, area] of Object.entries(areaPermissions)) {
    if (area.allowedRoles === '*' || area.allowedRoles.includes(role)) {
      allowedAreas.push({
        id: areaId,
        name: area.name,
        riskLevel: area.riskLevel,
        restricted: area.restricted
      });
    }
  }
  
  return allowedAreas;
}

/**
 * Middleware Express para validar acesso
 */
function validateAccess(req, res, next) {
  const { role, areaId } = req.body;
  
  if (!role || !areaId) {
    return res.status(400).json({
      success: false,
      message: 'role e areaId são obrigatórios'
    });
  }
  
  const hasAccess = checkAccess(role, areaId);
  const area = getAreaInfo(areaId);
  
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'Acesso não autorizado',
      details: {
        role,
        area: area ? area.name : areaId,
        riskLevel: area ? area.riskLevel : 'DESCONHECIDO'
      }
    });
  }
  
  // Adicionar informações ao request para uso posterior
  req.accessControl = {
    authorized: true,
    area
  };
  
  next();
}

/**
 * Gerar relatório de acessos por função
 * @returns {object} - Estatísticas de acesso
 */
function getAccessReport() {
  const report = {
    totalAreas: Object.keys(areaPermissions).length,
    restrictedAreas: getRestrictedAreas().length,
    freeAreas: Object.keys(areaPermissions).filter(id => 
      areaPermissions[id].allowedRoles === '*'
    ).length,
    riskLevels: {
      ALTO: 0,
      MÉDIO: 0,
      BAIXO: 0
    }
  };
  
  Object.values(areaPermissions).forEach(area => {
    if (area.riskLevel in report.riskLevels) {
      report.riskLevels[area.riskLevel]++;
    }
  });
  
  return report;
}

module.exports = {
  checkAccess,
  getAreaInfo,
  getRestrictedAreas,
  getAllowedAreasForRole,
  validateAccess,
  getAccessReport,
  areaPermissions
};
