const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require("dotenv").config();


const client = new Client({
    puppeteer: {
        executablePath: '/usr/bin/chromium-browser',
    },
    authStrategy: new LocalAuth({
        dataPath: './'
    }),
    webVersionCache: {
        type: "remote",
        remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
});
client.on('ready', () => {
    console.log('Client is ready!');
    listarTodosOsGrupos(client);
    listarMembrosDosGrupos(client);

});
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});
client.on('authenticated', () => {
    console.log("Autenticado")
});
client.initialize();

/**
 * Função para listar grupos e salvar em arquivo
 * @param {object} client - A instância do cliente do WhatsApp Web iniciada
 */
async function listarTodosOsGrupos(client) {
    console.log("🔍 Buscando lista de chats...");

    try {
        // 1. Pega todos os chats (conversas, grupos, listas de transmissão)
        const chats = await client.getChats();

        // 2. Filtra apenas o que é Grupo
        const grupos = chats.filter(chat => chat.isGroup);

        console.log(`✅ Encontrados ${grupos.length} grupos.`);

        // 3. Cria uma lista formatada
        const listaFormatada = grupos.map(grupo => {
            return {
                nome: grupo.name,
                id: grupo.id._serialized
            };
        });

        fs.writeFileSync('./database/meus_grupos_wpp.json', JSON.stringify(listaFormatada, null, 2));
        console.log("💾 Lista salva no arquivo 'meus_grupos.json'");

    } catch (erro) {
        console.error("❌ Erro ao listar grupos:", erro);
    }
}



async function listarMembrosDosGrupos(client) {
    console.log("🔍 Iniciando varredura de membros (isso pode demorar um pouco)...");

    try {
        const chats = await client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);

        console.log(`✅ Encontrados ${grupos.length} grupos. Extraindo membros...`);

        const relatorioCompleto = [];

        // Loop pelos grupos
        for (const grupo of grupos) {
            console.log(`   📂 Lendo grupo: ${grupo.name}`);
            
            const listaMembros = [];

            // Loop pelos participantes dentro do grupo
            for (const participante of grupo.participants) {
                let nomeContato = "Desconhecido";
                const numero = participante.id.user; // O número de telefone

                // Tenta buscar o nome do contato (pode falhar se o WhatsApp tiver mudado algo)
                try {
                    const contato = await client.getContactById(participante.id._serialized);
                    nomeContato = contato.pushname || contato.name || "Sem nome salvo";
                } catch (e) {
                    nomeContato = "Erro ao buscar nome";
                }

                listaMembros.push({
                    numero: numero,
                    nome: nomeContato,
                    admin: participante.isAdmin // true se for admin
                });
            }

            relatorioCompleto.push({
                grupo: grupo.name,
                id_grupo: grupo.id._serialized,
                total_participantes: listaMembros.length,
                membros: listaMembros
            });


        }

        // Salva no arquivo
        fs.writeFileSync('./database/membros_dos_grupos_wpp.json', JSON.stringify(relatorioCompleto, null, 2));
        console.log("\n💾 SUCESSO! Lista de membros salva em 'membros_dos_grupos.json'");

    } catch (erro) {
        console.error("❌ Erro ao extrair membros:", erro);
    }
}




// module.exports = { listarTodosOsGrupos, listarMembrosDosGrupos };