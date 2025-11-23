# scripts/run_servers_python.py
# Abre duas janelas do PowerShell e executa os comandos especificados.
# Pode ser empacotado com PyInstaller (veja README abaixo).

import subprocess
import os

proj_root = r"C:\projetos\Connection-4"
backend = os.path.join(proj_root, "backend")

# Abre servidor frontend (nova janela PowerShell)
subprocess.Popen([
    "powershell",
    "-NoExit",
    "-Command",
    f"Set-Location -LiteralPath '{proj_root}'; python -m http.server 8000"
], creationflags=subprocess.CREATE_NEW_CONSOLE)

# Abre servidor backend (nova janela PowerShell)
subprocess.Popen([
    "powershell",
    "-NoExit",
    "-Command",
    f"Set-Location -LiteralPath '{backend}'; npm run dev"
], creationflags=subprocess.CREATE_NEW_CONSOLE)

print("Terminais iniciados.")
input("Pressione Enter para sair deste launcher...")
