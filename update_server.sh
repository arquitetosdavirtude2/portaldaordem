#!/bin/bash
echo "Iniciando atualização do servidor..."
git checkout main
git pull origin main
echo "Instalando dependências e buildando frontend..."
cd frontend
npm install
npm run build
cd ..
echo "Reiniciando servidor backend..."
touch backend/tmp/restart.txt
echo "Aguardando reinicialização..."
sleep 5
echo "Executando migração de banco de dados..."
curl -X GET https://portaldaordem.com.br/api/tesouraria/debug/migrate
echo -e "\nProcesso concluído!"
