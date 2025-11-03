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
        
        # Definir áreas de trabalho no canteiro
        self.work_areas = {
            "entrada": {"x": 0.06, "y": 0.08, "name": "Portaria/Entrada"},
            "escritorio": {"x": 0.20, "y": 0.12, "name": "Escritório de Obras"},
            "almoxarifado": {"x": 0.80, "y": 0.08, "name": "Almoxarifado"},
            "area_construcao": {"x": 0.45, "y": 0.34, "name": "Área de Construção Principal"},
            "betoneira": {"x": 0.25, "y": 0.52, "name": "Central de Concreto"},
            "oficina": {"x": 0.72, "y": 0.54, "name": "Oficina de Manutenção"},
            "refeitorio": {"x": 0.06, "y": 0.72, "name": "Refeitório"},
            "vestiario": {"x": 0.16, "y": 0.84, "name": "Vestiário"},
            "zona_perigo_1": {"x": 0.36, "y": 0.16, "name": "Zona de Risco - Guindastes"},
            "zona_perigo_2": {"x": 0.64, "y": 0.32, "name": "Zona de Risco - Soldas"},
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
        
        # Criar alguns dispositivos e pessoas com posições iniciais específicas
        test_data = [
            {"device": "DEV001", "name": "João Silva", "role": "Pedreiro", "area": "area_construcao"},
            {"device": "DEV002", "name": "Maria Santos", "role": "Engenheira", "area": "escritorio"},
            {"device": "DEV003", "name": "Carlos Lima", "role": "Eletricista", "area": "oficina"},
            {"device": "DEV004", "name": "Ana Costa", "role": "Soldadora", "area": "zona_perigo_2"},
            {"device": "DEV005", "name": "Pedro Souza", "role": "Operador", "area": "betoneira"},
            {"device": "DEV006", "name": "Luiza Ferreira", "role": "Almoxarife", "area": "almoxarifado"},
            {"device": "DEV007", "name": "Roberto Oliveira", "role": "Guincheiro", "area": "zona_perigo_1"},
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
        """Atribui novo destino para um dispositivo"""
        area_keys = list(self.work_areas.keys())
        target_area = random.choice(area_keys)
        area = self.work_areas[target_area]
        
        # Adicionar pequena variação na posição da área
        target = {
            "x": area["x"] + random.uniform(-0.04, 0.04),
            "y": area["y"] + random.uniform(-0.04, 0.04),
            "area_name": area["name"]
        }
        
        # Garantir que não saia dos limites
        target["x"] = max(0.05, min(0.95, target["x"]))
        target["y"] = max(0.05, min(0.95, target["y"]))
        
        self.device_targets[device_id] = target
        print(f"   🎯 {device_id} direcionado para {target['area_name']}")

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
                        
                        # Inicializar posição se não existir
                        if device_id not in self.device_positions:
                            self.device_positions[device_id] = {"x": 0.5, "y": 0.5}
                        
                        # Atribuir novo alvo se não tiver ou chegou ao destino
                        if (device_id not in self.device_targets or 
                            self.calculate_distance(self.device_positions[device_id], self.device_targets[device_id]) < 0.02):
                            self.assign_new_target(device_id)
                        
                        # Calcular próxima posição
                        current_pos = self.device_positions[device_id]
                        target_pos = self.device_targets[device_id]
                        next_pos = self.get_next_position(current_pos, target_pos, speed=0.008)  # Velocidade realista
                        
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
    
    print(f"\n�️ Áreas de trabalho definidas:")
    for area_id, area in sim.work_areas.items():
        print(f"   📍 {area['name']} - ({area['x']:.2f}, {area['y']:.2f})")
    
    print("\n�💡 Iniciando simulação realista em 3 segundos...")
    print("💡 Os colaboradores se moverão entre as áreas de trabalho")
    print("💡 Pressione Ctrl+C para parar")
    time.sleep(3)
    
    try:
        sim.start_simulation(600)  # 10 minutos
    except KeyboardInterrupt:
        print("\n⏹️ Simulação interrompida pelo usuário")
        sim.running = False

if __name__ == "__main__":
    main()