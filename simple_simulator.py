#!/usr/bin/env python3
"""
Simulador Realista para Connection-4
===================================

Versão com movimento realista e rotas entre áreas de trabalho.
"""

import requests
import json
import time
import random
import threading
import math

class RealisticSimulator:
    def __init__(self):
        self.api_url = "http://localhost:3000/api"
        self.token = None
        self.running = False
        self.device_positions = {}  # Armazenar posições atuais
        self.device_targets = {}    # Armazenar destinos
        self.device_routes = {}     # Armazenar rotas
        
        # Definir áreas de trabalho no canteiro - ATUALIZADO para o novo layout profissional
        self.work_areas = {
            # LINHA 1 - ADMINISTRAÇÃO (y: 0.02-0.18)
            "entrada": {"x": 0.08, "y": 0.10, "name": "Portaria Principal"},
            "escritorio": {"x": 0.26, "y": 0.10, "name": "Escritório de Obras"},
            "zona_perigo_1": {"x": 0.49, "y": 0.10, "name": "Área de Guindastes"},
            "almoxarifado": {"x": 0.71, "y": 0.10, "name": "Almoxarifado Geral"},
            "estacionamento": {"x": 0.90, "y": 0.10, "name": "Estacionamento"},
            
            # LINHA 2 - PRODUÇÃO (y: 0.22-0.42)
            "area_construcao": {"x": 0.16, "y": 0.32, "name": "Construção Principal"},
            "zona_perigo_2": {"x": 0.44, "y": 0.32, "name": "Área de Soldas"},
            "oficina": {"x": 0.68, "y": 0.32, "name": "Oficina Mecânica"},
            "deposito": {"x": 0.89, "y": 0.32, "name": "Depósito Material"},
            
            # LINHA 3 - SERVIÇOS (y: 0.46-0.66)
            "betoneira": {"x": 0.13, "y": 0.56, "name": "Central de Concreto"},
            "refeitorio": {"x": 0.39, "y": 0.56, "name": "Refeitório"},
            "enfermaria": {"x": 0.63, "y": 0.56, "name": "Enfermaria"},
            "laboratorio": {"x": 0.86, "y": 0.56, "name": "Lab. Qualidade"},
            
            # LINHA 4 - APOIO (y: 0.70-0.88)
            "vestiario_masc": {"x": 0.11, "y": 0.79, "name": "Vestiário Masculino"},
            "vestiario_fem": {"x": 0.31, "y": 0.79, "name": "Vestiário Feminino"},
            "limpeza": {"x": 0.50, "y": 0.79, "name": "Área de Limpeza"},
            "manutencao": {"x": 0.70, "y": 0.79, "name": "Manutenção"},
            "guarita": {"x": 0.90, "y": 0.79, "name": "Guarita Saída"},
        }

    def login(self):
        """Faz login e obtém token"""
        try:
            # Usar credenciais do usuário existente no MongoDB
            print("🔐 Fazendo login com usuário marco...")
            response = requests.post(f"{self.api_url}/auth/login", 
                                   json={"email": "marcobubola@hotmail.com", "password": "123456"})
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"✅ Login bem-sucedido!")
                
                # Verificar estrutura da resposta e extrair token
                if 'data' in response_data and 'token' in response_data['data']:
                    self.token = response_data['data']['token']
                    print("✅ Token obtido com sucesso!")
                    return True
                elif 'token' in response_data:
                    self.token = response_data['token']
                    print("✅ Token obtido com sucesso!")
                    return True
                elif 'access_token' in response_data:
                    self.token = response_data['access_token']
                    print("✅ Token obtido com sucesso!")
                    return True
                else:
                    print("❌ Token não encontrado na resposta")
                    print(f"📄 Estrutura da resposta: {list(response_data.keys())}")
                    return False
            else:
                print(f"❌ Erro no login: {response.status_code}")
                if response.status_code == 400:
                    print("   💡 Verifique se a senha está correta")
                elif response.status_code == 404:
                    print("   💡 Usuário não encontrado")
                print(f"   📄 Resposta: {response.text}")
                return False
            
        except Exception as e:
            print(f"❌ Erro no login: {e}")
        return False

    def get_headers(self):
        return {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}

    def create_test_data(self):
        """Cria dados de teste"""
        print("🏗️ Criando dados de teste...")
        
        # Criar dispositivos e pessoas com posições nas novas áreas profissionais
        test_data = [
            # LINHA 1 - ADMINISTRAÇÃO
            {"device": "DEV001", "name": "Maria Santos", "role": "Engenheira Civil", "area": "escritorio"},
            {"device": "DEV002", "name": "João Silva", "role": "Operador de Guindaste", "area": "zona_perigo_1"},
            {"device": "DEV003", "name": "Luiza Ferreira", "role": "Almoxarife", "area": "almoxarifado"},
            {"device": "DEV004", "name": "Carlos Porteiro", "role": "Porteiro", "area": "entrada"},
            
            # LINHA 2 - PRODUÇÃO
            {"device": "DEV005", "name": "Pedro Construção", "role": "Pedreiro", "area": "area_construcao"},
            {"device": "DEV006", "name": "Ana Costa", "role": "Soldadora", "area": "zona_perigo_2"},
            {"device": "DEV007", "name": "Roberto Mecânico", "role": "Mecânico", "area": "oficina"},
            {"device": "DEV008", "name": "José Estoque", "role": "Auxiliar de Depósito", "area": "deposito"},
            
            # LINHA 3 - SERVIÇOS
            {"device": "DEV009", "name": "Carlos Lima", "role": "Operador de Betoneira", "area": "betoneira"},
            {"device": "DEV010", "name": "Fernanda Nutrição", "role": "Cozinheira", "area": "refeitorio"},
            {"device": "DEV011", "name": "Dra. Silva", "role": "Enfermeira", "area": "enfermaria"},
            {"device": "DEV012", "name": "Eng. Qualidade", "role": "Técnico em Qualidade", "area": "laboratorio"},
            
            # LINHA 4 - APOIO
            {"device": "DEV013", "name": "Marcos Manutenção", "role": "Técnico de Manutenção", "area": "manutencao"},
            {"device": "DEV014", "name": "Silvia Limpeza", "role": "Auxiliar de Limpeza", "area": "limpeza"},
            {"device": "DEV015", "name": "Antônio Segurança", "role": "Vigilante", "area": "guarita"},
        ]

        for data in test_data:
            try:
                # Criar dispositivo
                device_response = requests.post(f"{self.api_url}/devices", 
                    json={"id": data["device"], "type": "worker", "active": True},
                    headers=self.get_headers())
                
                # Criar pessoa
                person_response = requests.post(f"{self.api_url}/people", 
                    json={"name": data["name"], "role": data["role"], "deviceId": data["device"]},
                    headers=self.get_headers())
                
                # Posição inicial na área de trabalho específica
                area = self.work_areas[data["area"]]
                x = area["x"] + random.uniform(-0.03, 0.03)  # Pequena variação
                y = area["y"] + random.uniform(-0.03, 0.03)
                
                # Armazenar posição inicial
                self.device_positions[data["device"]] = {"x": x, "y": y}
                
                position_response = requests.post(f"{self.api_url}/positions", 
                    json={"deviceId": data["device"], "x": x, "y": y, "timestamp": time.time()},
                    headers=self.get_headers())
                
                print(f"   ✅ {data['name']} - {data['role']} (ID: {data['device']}) em {area['name']}")
                
            except Exception as e:
                print(f"   ❌ Erro ao criar {data['name']}: {e}")

    def calculate_distance(self, pos1, pos2):
        """Calcula distância entre duas posições"""
        return math.sqrt((pos1["x"] - pos2["x"])**2 + (pos1["y"] - pos2["y"])**2)

    def get_next_position(self, current, target, speed=0.01):
        """Calcula próxima posição em direção ao alvo"""
        distance = self.calculate_distance(current, target)
        
        if distance <= speed:
            return target
        
        # Calcular direção
        dx = target["x"] - current["x"]
        dy = target["y"] - current["y"]
        
        # Normalizar e aplicar velocidade
        factor = speed / distance
        
        return {
            "x": current["x"] + dx * factor,
            "y": current["y"] + dy * factor
        }

    def assign_new_target(self, device_id):
        """Atribui novo destino inteligente baseado no tipo de colaborador"""
        
        # Definir áreas preferenciais por tipo de colaborador
        role_preferences = {
            "Engenheira Civil": ["escritorio", "area_construcao", "laboratorio"],
            "Operador de Guindaste": ["zona_perigo_1", "area_construcao", "deposito"],
            "Almoxarife": ["almoxarifado", "deposito", "entrada"],
            "Porteiro": ["entrada", "guarita", "estacionamento"],
            "Pedreiro": ["area_construcao", "betoneira", "almoxarifado"],
            "Soldadora": ["zona_perigo_2", "oficina", "almoxarifado"],
            "Mecânico": ["oficina", "manutencao", "deposito"],
            "Auxiliar de Depósito": ["deposito", "almoxarifado", "area_construcao"],
            "Operador de Betoneira": ["betoneira", "area_construcao", "laboratorio"],
            "Cozinheira": ["refeitorio", "limpeza"],
            "Enfermeira": ["enfermaria", "refeitorio", "escritorio"],
            "Técnico em Qualidade": ["laboratorio", "area_construcao", "escritorio"],
            "Técnico de Manutenção": ["manutencao", "oficina", "deposito"],
            "Auxiliar de Limpeza": ["limpeza", "refeitorio", "vestiario_masc", "vestiario_fem"],
            "Vigilante": ["guarita", "entrada", "estacionamento"],
        }
        
        # Buscar role do colaborador (simplificado - usar device_id)
        device_num = device_id.replace("DEV", "").zfill(3)
        
        # Mapear device para role baseado na ordem dos test_data
        role_map = {
            "001": "Engenheira Civil", "002": "Operador de Guindaste", "003": "Almoxarife", "004": "Porteiro",
            "005": "Pedreiro", "006": "Soldadora", "007": "Mecânico", "008": "Auxiliar de Depósito",
            "009": "Operador de Betoneira", "010": "Cozinheira", "011": "Enfermeira", "012": "Técnico em Qualidade",
            "013": "Técnico de Manutenção", "014": "Auxiliar de Limpeza", "015": "Vigilante"
        }
        
        role = role_map.get(device_num, "Pedreiro")  # Default para Pedreiro
        preferred_areas = role_preferences.get(role, list(self.work_areas.keys()))
        
        # 80% chance de ir para área preferencial, 20% para qualquer área
        if random.random() < 0.8:
            target_area = random.choice(preferred_areas)
        else:
            target_area = random.choice(list(self.work_areas.keys()))
        
        area = self.work_areas[target_area]
        
        # Adicionar variação realista na posição da área
        target = {
            "x": area["x"] + random.uniform(-0.06, 0.06),
            "y": area["y"] + random.uniform(-0.06, 0.06),
            "area_name": area["name"]
        }
        
        # Garantir que não saia dos limites
        target["x"] = max(0.05, min(0.95, target["x"]))
        target["y"] = max(0.05, min(0.95, target["y"]))
        
        self.device_targets[device_id] = target
        print(f"   🎯 {device_id} ({role}) → {target['area_name']}")
        
        return target

    def move_devices(self):
        """Move dispositivos de forma realista"""
        try:
            # Buscar dispositivos ativos
            devices_response = requests.get(f"{self.api_url}/devices", headers=self.get_headers())
            
            if devices_response.status_code == 200:
                response_data = devices_response.json()
                
                if isinstance(response_data, dict) and 'data' in response_data:
                    devices = response_data['data']
                elif isinstance(response_data, list):
                    devices = response_data
                else:
                    devices = []
                
                moved_count = 0
                for device in devices:
                    if isinstance(device, dict) and device.get('active'):
                        device_id = device["id"]
                        device_type = device.get("type", "worker")
                        
                        # APENAS mover dispositivos do tipo 'worker' - sensores são FIXOS
                        if device_type != "worker" or "SENSOR_" in device_id:
                            print(f"🔒 Sensor fixo {device_id} mantido em posição estática")
                            continue
                        
                        # Inicializar posição se não existir
                        if device_id not in self.device_positions:
                            self.device_positions[device_id] = {"x": 0.5, "y": 0.5}
                        
                        # Atribuir novo alvo se não tiver ou chegou ao destino
                        if (device_id not in self.device_targets or 
                            self.calculate_distance(self.device_positions[device_id], self.device_targets[device_id]) < 0.03):
                            self.assign_new_target(device_id)
                        
                        # Calcular próxima posição com velocidade variável
                        current_pos = self.device_positions[device_id]
                        target_pos = self.device_targets[device_id]
                        
                        # Velocidade baseada na distância (mais lento perto do destino)
                        distance = self.calculate_distance(current_pos, target_pos)
                        base_speed = 0.012  # Velocidade base aumentada
                        speed = base_speed * min(1.0, distance * 10)  # Desacelera perto do destino
                        
                        next_pos = self.get_next_position(current_pos, target_pos, speed=speed)
                        
                        # Atualizar posição
                        self.device_positions[device_id] = next_pos
                        
                        # Enviar para API
                        requests.post(f"{self.api_url}/positions", 
                            json={"deviceId": device_id, "x": next_pos["x"], "y": next_pos["y"], "timestamp": time.time()},
                            headers=self.get_headers())
                        moved_count += 1
                
                print(f"🏃 Movimentados {moved_count} dispositivos de forma realista")
            else:
                print(f"❌ Erro ao buscar dispositivos: {devices_response.status_code}")
            
        except Exception as e:
            print(f"❌ Erro no movimento: {e}")
            import traceback
            traceback.print_exc()

    def start_simulation(self, duration=300):  # 5 minutos
        """Inicia simulação por tempo determinado"""
        print(f"🚀 Iniciando simulação por {duration} segundos...")
        self.running = True
        
        start_time = time.time()
        step = 0
        
        while self.running and (time.time() - start_time) < duration:
            step += 1
            print(f"\n📊 Step {step} - {time.strftime('%H:%M:%S')}")
            
            self.move_devices()
            time.sleep(3)  # Atualiza a cada 3 segundos
        
        self.running = False
        print("🏁 Simulação finalizada!")

def main():
    print("🎮 SIMULADOR REALISTA - CONNECTION-4")
    print("=" * 40)
    
    sim = RealisticSimulator()
    
    # Fazer login
    if not sim.login():
        print("❌ Erro na autenticação. Verifique se o backend está rodando.")
        return
    
    # Criar dados de teste
    sim.create_test_data()
    
    print(f"\n🏗️ Layout Profissional do Canteiro ({len(sim.work_areas)} áreas):")
    print("   📍 LINHA 1 - ADMINISTRAÇÃO:")
    for area_id in ["entrada", "escritorio", "zona_perigo_1", "almoxarifado", "estacionamento"]:
        if area_id in sim.work_areas:
            area = sim.work_areas[area_id]
            print(f"      • {area['name']} - ({area['x']:.2f}, {area['y']:.2f})")
    
    print("   📍 LINHA 2 - PRODUÇÃO:")
    for area_id in ["area_construcao", "zona_perigo_2", "oficina", "deposito"]:
        if area_id in sim.work_areas:
            area = sim.work_areas[area_id]
            print(f"      • {area['name']} - ({area['x']:.2f}, {area['y']:.2f})")
    
    print("   � LINHA 3 - SERVIÇOS:")
    for area_id in ["betoneira", "refeitorio", "enfermaria", "laboratorio"]:
        if area_id in sim.work_areas:
            area = sim.work_areas[area_id]
            print(f"      • {area['name']} - ({area['x']:.2f}, {area['y']:.2f})")
    
    print("   📍 LINHA 4 - APOIO:")
    for area_id in ["vestiario_masc", "vestiario_fem", "limpeza", "manutencao", "guarita"]:
        if area_id in sim.work_areas:
            area = sim.work_areas[area_id]
            print(f"      • {area['name']} - ({area['x']:.2f}, {area['y']:.2f})")
    
    print("\n🎯 Simulação Inteligente:")
    print("💡 15 colaboradores especializados se movendo por suas áreas preferenciais")
    print("💡 Movimentação baseada na função de cada trabalhador")
    print("💡 Velocidade variável e comportamento realista")
    print("💡 Pressione Ctrl+C para parar")
    time.sleep(3)
    
    try:
        sim.start_simulation(600)  # 10 minutos
    except KeyboardInterrupt:
        print("\n⏹️ Simulação interrompida pelo usuário")
        sim.running = False

if __name__ == "__main__":
    main()