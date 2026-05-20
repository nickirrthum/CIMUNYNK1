#!/bin/bash
set -e

echo ""
echo "=============================="
echo "  Fluxo de Caixa - Sistema"
echo "=============================="
echo ""

# Instalar dependências se necessário
if [ ! -d "backend/node_modules" ]; then
  echo "[1/2] Instalando dependências do backend..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "[2/2] Instalando dependências do frontend..."
  cd frontend && npm install && cd ..
fi

# Matar processos antigos nas portas
echo "Liberando portas..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Iniciar backend em background
echo "Iniciando backend na porta 3001..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

sleep 2

# Iniciar frontend em background
echo "Iniciando frontend na porta 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "=============================="
echo "  Sistema rodando!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "=============================="
echo ""
echo "  Admin:  admin@cashflow.com  | admin123"
echo "  Viewer: viewer@cashflow.com | viewer123"
echo ""
echo "  Pressione Ctrl+C para encerrar."
echo ""

trap "echo ''; echo 'Encerrando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
