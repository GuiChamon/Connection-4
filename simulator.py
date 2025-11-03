#!/usr/bin/env python3
"""
Simulador de Movimento para Sistema Connection-4
================================================

Este script simula movimento realista de colaboradores em um canteiro de obras,
enviando atualizações de posição para a API REST do sistema.

Recursos:
- Movimento baseado em padrões reais de trabalho
- Zonas de atração (colaboradores tendem a ir para áreas de trabalho)
- Zonas de perigo (movimento cauteloso em áreas de risco)
- Horários de trabalho (pausas, almoço, etc.)
- Diferentes tipos de trabalhadores com comportamentos únicos

Uso:
    python simulator.py [--speed SPEED] [--workers N] [--duration MINUTES]

Exemplo:
    python simulator.py --speed 2 --workers 5 --duration 60
"""

import requests
import json
import time
import random
import math
import threading
import argparse
from datetime import datetime, timedelta
import sys

class ConstructionSiteSimulator:
    def __init__(self, api_base_url="http://localhost:3000/api", auth_token=None):
        self.api_base_url = api_base_url
        self.auth_token = auth_token
        self.workers = []
        self.devices = []
        self.is_running = False
        self.speed_multiplier = 1.0
        
        # Definir áreas do canteiro de obras (coordenadas relativas 0-1)
        self.areas = {
            'office': {'x': 0.05, 'y': 0.05, 'width': 0.15, 'height': 0.20, 'attraction': 0.3},
            'storage': {'x': 0.80, 'y': 0.05, 'width': 0.15, 'height': 0.25, 'attraction': 0.4},
            'construction': {'x': 0.20, 'y': 0.35, 'width': 0.40, 'height': 0.35, 'attraction': 0.8},
            'machinery': {'x': 0.05, 'y': 0.75, 'width': 0.25, 'height': 0.20, 'attraction': 0.6},
            'cafeteria': {'x': 0.05, 'y': 0.30, 'width': 0.12, 'height': 0.15, 'attraction': 0.9},  # Alta atração na hora do almoço
            'entrance': {'x': 0.45, 'y': 0.92, 'width': 0.10, 'height': 0.08, 'attraction': 0.2},
        }
        
        # Zonas de perigo (colaboradores evitam ou se movem com cuidado)
        self.danger_zones = {
            'crane_danger': {'x': 0.30, 'y': 0.15, 'width': 0.20, 'height': 0.20, 'danger_level': 0.8},
            'excavation': {'x': 0.70, 'y': 0.60, 'width': 0.15, 'height': 0.25, 'danger_level': 0.9},
        }
        
        # Padrões de horário de trabalho
        self.work_schedule = {
            'work_start': 7,    # 7h
            'lunch_start': 12,  # 12h
            'lunch_end': 13,    # 13h
            'work_end': 17,     # 17h
        }

    def authenticate(self, username="admin", password="123456"):
        """Autentica com a API e obtém token JWT"""
        try:
            response = requests.post(f"{self.api_base_url}/auth/login", 
                                   json={"username": username, "password": password})
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')
                print(f"✅ Autenticado como {data.get('user', {}).get('username', 'usuário')}")
                return True
            else:
                print(f"❌ Erro na autenticação: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            print(f"❌ Erro de conexão na autenticação: {e}")
            return False

    def get_headers(self):
        """Retorna headers com token de autenticação"""
        if not self.auth_token:
            raise Exception("Token de autenticação não disponível")
        return {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json'
        }

    def fetch_workers_and_devices(self):
        """Busca colaboradores e dispositivos da API"""
        try:
            # Buscar pessoas
            people_response = requests.get(f"{self.api_base_url}/people", headers=self.get_headers())
            if people_response.status_code == 200:
                people = people_response.json()
                self.workers = [p for p in people if p.get('deviceId')]
                print(f"📊 Carregados {len(self.workers)} colaboradores com dispositivos")
            
            # Buscar dispositivos
            devices_response = requests.get(f"{self.api_base_url}/devices", headers=self.get_headers())
            if devices_response.status_code == 200:
                self.devices = devices_response.json()
                print(f"📱 Carregados {len(self.devices)} dispositivos")
                
            return True
            
        except requests.RequestException as e:
            print(f"❌ Erro ao buscar dados: {e}")
            return False

    def create_sample_data(self, num_workers=5):
        """Cria dados de exemplo se não existirem"""
        print(f"🏗️ Criando {num_workers} colaboradores de exemplo...")
        
        worker_roles = [
            "Pedreiro", "Eletricista", "Encanador", "Soldador", "Operador de Máquinas",
            "Engenheiro Civil", "Mestre de Obras", "Servente", "Carpinteiro", "Pintor"
        ]
        
        worker_names = [
            "João Silva", "Maria Santos", "Carlos Oliveira", "Ana Costa", "Pedro Souza",
            "Lucia Ferreira", "Roberto Lima", "Julia Alves", "Marcos Pereira", "Fernanda Rocha"
        ]
        
        created_count = 0
        
        for i in range(num_workers):
            # Criar dispositivo
            device_id = f"DEV{1000 + i}"
            device_data = {
                "id": device_id,
                "type": "worker",
                "active": True
            }
            
            try:
                device_response = requests.post(f"{self.api_base_url}/devices", 
                                              json=device_data, headers=self.get_headers())
                
                if device_response.status_code in [200, 201]:
                    # Criar pessoa
                    person_data = {
                        "name": worker_names[i % len(worker_names)],
                        "role": worker_roles[i % len(worker_roles)],
                        "deviceId": device_id
                    }
                    
                    person_response = requests.post(f"{self.api_base_url}/people", 
                                                  json=person_data, headers=self.get_headers())
                    
                    if person_response.status_code in [200, 201]:
                        created_count += 1
                        print(f"   ✅ Criado: {person_data['name']} - {person_data['role']} (ID: {device_id})")
                        
                        # Definir posição inicial aleatória
                        initial_x = random.uniform(0.1, 0.9)
                        initial_y = random.uniform(0.1, 0.9)
                        self.update_device_position(device_id, initial_x, initial_y)
                        
            except requests.RequestException as e:
                print(f"   ❌ Erro ao criar colaborador {i+1}: {e}")
        
        print(f"🎯 Criados {created_count} colaboradores com sucesso!")
        return created_count > 0

    def update_device_position(self, device_id, x, y):
        """Atualiza posição de um dispositivo via API"""
        try:
            position_data = {
                "deviceId": device_id,
                "x": round(x, 4),
                "y": round(y, 4),
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(f"{self.api_base_url}/positions", 
                                   json=position_data, headers=self.get_headers())
            
            return response.status_code in [200, 201]
            
        except requests.RequestException as e:
            print(f"❌ Erro ao atualizar posição de {device_id}: {e}")
            return False

    def get_current_work_phase(self):
        """Determina a fase atual do trabalho baseada no horário"""
        current_hour = datetime.now().hour
        
        if current_hour < self.work_schedule['work_start']:
            return 'before_work'
        elif current_hour < self.work_schedule['lunch_start']:
            return 'morning_work'
        elif current_hour < self.work_schedule['lunch_end']:
            return 'lunch_break'
        elif current_hour < self.work_schedule['work_end']:
            return 'afternoon_work'
        else:
            return 'after_work'

    def calculate_area_attraction(self, worker_position, work_phase):
        """Calcula atração das áreas baseada na fase do trabalho"""
        attractions = {}
        
        for area_name, area in self.areas.items():
            base_attraction = area['attraction']
            
            # Modificar atração baseada na fase do trabalho
            if work_phase == 'lunch_break' and area_name == 'cafeteria':
                base_attraction *= 3.0  # Muito atraente na hora do almoço
            elif work_phase == 'lunch_break' and area_name in ['construction', 'machinery']:
                base_attraction *= 0.2  # Menos atraente durante o almoço
            elif work_phase in ['before_work', 'after_work'] and area_name == 'entrance':
                base_attraction *= 2.0  # Atraente no início/fim do expediente
                
            attractions[area_name] = base_attraction
            
        return attractions

    def simulate_realistic_movement(self, device_id, current_x, current_y):
        """Simula movimento realista para um colaborador"""
        work_phase = self.get_current_work_phase()
        attractions = self.calculate_area_attraction((current_x, current_y), work_phase)
        
        # Calcular movimento baseado em atração das áreas
        target_x, target_y = current_x, current_y
        total_attraction = 0
        
        for area_name, area in self.areas.items():
            area_center_x = area['x'] + area['width'] / 2
            area_center_y = area['y'] + area['height'] / 2
            
            # Distância para o centro da área
            distance = math.sqrt((current_x - area_center_x)**2 + (current_y - area_center_y)**2)
            
            # Atração inversamente proporcional à distância
            if distance > 0:
                attraction_strength = attractions[area_name] / (distance + 0.1)
                total_attraction += attraction_strength
                
                # Mover em direção à área atraente
                direction_x = (area_center_x - current_x) / distance
                direction_y = (area_center_y - current_y) / distance
                
                target_x += direction_x * attraction_strength * 0.01
                target_y += direction_y * attraction_strength * 0.01
        
        # Adicionar movimento aleatório (comportamento humano natural)
        random_factor = 0.02
        target_x += random.uniform(-random_factor, random_factor)
        target_y += random.uniform(-random_factor, random_factor)
        
        # Verificar zonas de perigo e reduzir velocidade
        for danger_zone in self.danger_zones.values():
            danger_center_x = danger_zone['x'] + danger_zone['width'] / 2
            danger_center_y = danger_zone['y'] + danger_zone['height'] / 2
            danger_distance = math.sqrt((current_x - danger_center_x)**2 + (current_y - danger_center_y)**2)
            
            # Se próximo ao perigo, mover-se mais devagar e cautelosamente
            if danger_distance < 0.2:
                movement_reduction = danger_zone['danger_level']
                target_x = current_x + (target_x - current_x) * (1 - movement_reduction)
                target_y = current_y + (target_y - current_y) * (1 - movement_reduction)
        
        # Limitar movimento por step (velocidade realista)
        max_step = 0.02 * self.speed_multiplier
        movement_x = max(-max_step, min(max_step, target_x - current_x))
        movement_y = max(-max_step, min(max_step, target_y - current_y))
        
        new_x = max(0.02, min(0.98, current_x + movement_x))
        new_y = max(0.02, min(0.98, current_y + movement_y))
        
        return new_x, new_y

    def get_current_positions(self):
        """Busca posições atuais dos dispositivos"""
        try:
            response = requests.get(f"{self.api_base_url}/positions", headers=self.get_headers())
            if response.status_code == 200:
                positions_data = response.json()
                # Converter para formato {device_id: {x, y}}
                positions = {}
                for pos in positions_data:
                    positions[pos['deviceId']] = {'x': pos['x'], 'y': pos['y']}
                return positions
            return {}
        except requests.RequestException as e:
            print(f"❌ Erro ao buscar posições: {e}")
            return {}

    def simulation_step(self):
        """Executa um passo da simulação"""
        current_positions = self.get_current_positions()
        
        updated_count = 0
        for worker in self.workers:
            device_id = worker['deviceId']
            
            # Obter posição atual ou usar posição padrão
            current_pos = current_positions.get(device_id, {'x': 0.5, 'y': 0.5})
            current_x, current_y = current_pos['x'], current_pos['y']
            
            # Calcular nova posição
            new_x, new_y = self.simulate_realistic_movement(device_id, current_x, current_y)
            
            # Atualizar na API
            if self.update_device_position(device_id, new_x, new_y):
                updated_count += 1
        
        work_phase = self.get_current_work_phase()
        print(f"🏃 Movimento simulado: {updated_count}/{len(self.workers)} colaboradores | Fase: {work_phase}")

    def run_simulation(self, duration_minutes=60, update_interval=3):
        """Executa a simulação por um período determinado"""
        print(f"🚀 Iniciando simulação por {duration_minutes} minutos...")
        print(f"⏱️ Atualizações a cada {update_interval} segundos")
        print(f"🏃 Velocidade: {self.speed_multiplier}x")
        
        self.is_running = True
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        step_count = 0
        
        try:
            while self.is_running and datetime.now() < end_time:
                step_count += 1
                elapsed = datetime.now() - start_time
                remaining = end_time - datetime.now()
                
                print(f"\n📊 Step {step_count} | Tempo decorrido: {elapsed} | Restante: {remaining}")
                
                self.simulation_step()
                time.sleep(update_interval / self.speed_multiplier)
                
        except KeyboardInterrupt:
            print("\n⏹️ Simulação interrompida pelo usuário")
        
        self.is_running = False
        print(f"\n🏁 Simulação finalizada após {step_count} steps!")

def main():
    parser = argparse.ArgumentParser(description='Simulador de Movimento para Connection-4')
    parser.add_argument('--speed', type=float, default=1.0, help='Multiplicador de velocidade (default: 1.0)')
    parser.add_argument('--workers', type=int, default=5, help='Número de colaboradores para criar (default: 5)')
    parser.add_argument('--duration', type=int, default=60, help='Duração em minutos (default: 60)')
    parser.add_argument('--interval', type=int, default=3, help='Intervalo entre atualizações em segundos (default: 3)')
    parser.add_argument('--api-url', default='http://localhost:3000/api', help='URL base da API')
    
    args = parser.parse_args()
    
    print("🏗️ SIMULADOR DE CANTEIRO DE OBRAS - CONNECTION-4")
    print("=" * 50)
    
    # Inicializar simulador
    simulator = ConstructionSiteSimulator(api_base_url=args.api_url)
    simulator.speed_multiplier = args.speed
    
    # Autenticar
    if not simulator.authenticate():
        print("❌ Falha na autenticação. Verifique se o backend está rodando.")
        sys.exit(1)
    
    # Carregar dados existentes
    if not simulator.fetch_workers_and_devices():
        print("⚠️ Erro ao carregar dados existentes")
    
    # Criar dados de exemplo se necessário
    if len(simulator.workers) == 0:
        print("📝 Nenhum colaborador encontrado. Criando dados de exemplo...")
        if not simulator.create_sample_data(args.workers):
            print("❌ Falha ao criar dados de exemplo")
            sys.exit(1)
        
        # Recarregar dados após criação
        simulator.fetch_workers_and_devices()
    
    print(f"\n🎯 Pronto para simular {len(simulator.workers)} colaboradores!")
    print("💡 Pressione Ctrl+C para parar a simulação")
    
    # Executar simulação
    simulator.run_simulation(duration_minutes=args.duration, update_interval=args.interval)

if __name__ == "__main__":
    main()