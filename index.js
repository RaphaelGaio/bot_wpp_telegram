const axios = require('axios');

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
// const { listarTodosOsGrupos, listarMembrosDosGrupos } = require('./utils/listarGrupos');
require("dotenv").config();
const FormDataPackage = require('form-data');

const botStartTime = Math.floor(Date.now() / 1000);


const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
});
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});
client.on('authenticated', () => {
    console.log("Autenticado")
});
client.initialize();


function sendToTelegram(text) {
    if (!text) return;
    axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: text
    }).catch(err => console.log("Erro Telegram (Texto):", err.message));
}


async function sendPhotoToTelegram(mediaBuffer, caption) {
    try {
        const form = new FormDataPackage();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('photo', mediaBuffer, 'imagem.jpg');
        
        if (caption) {
            form.append('caption', caption);
        }

        // Enviamos com os headers específicos gerados pelo form-data
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
            form,
            { headers: form.getHeaders() }
        );
        console.log("📸 Foto enviada para o Telegram!");
    } catch (err) {
        console.error("Erro Telegram (Foto):", err);
    }
}


client.on('message_create', async msg => {
    try {

        if (msg.timestamp < botStartTime) {
            // Se quiser debugar, descomente a linha abaixo:
            console.log("Ignorando mensagem antiga..."); 
            return; 
        }
        
        const chat = await msg.getChat();

        // ID do seu grupo específico
        const TARGET_GROUP_ID = "120363407719367369@g.us"; 
        // const TARGET_GROUP_ID = "120363422755978688@g.us"; 

        if (chat.isGroup && chat.id._serialized === TARGET_GROUP_ID) {

            // --- CENÁRIO A: Tem Mídia (Foto) ---
            if (msg.hasMedia) {
                console.log("📥 Baixando mídia...");
                const media = await msg.downloadMedia();
                
                if (media) {
                    // Verifica se é imagem (ignora áudios/stickers por enquanto)
                    if (media.mimetype.startsWith('image/')) {
                        
                        // Converte o Base64 do WhatsApp para Buffer (binário)
                        const buffer = Buffer.from(media.data, 'base64');
                        
                        // Monta a legenda
                        const legenda = `${msg.body || ""}`;

                        await sendPhotoToTelegram(buffer, legenda);
                    } else {
                        console.log(`⚠️ Mídia ignorada (Tipo: ${media.mimetype}) - Este código só envia imagens.`);
                        // Se quiser enviar aviso de áudio, pode chamar sendToTelegram aqui
                    }
                }
            } 
            
            // --- CENÁRIO B: Apenas Texto ---
            else if (msg.body) {
                const textoFormatado = `${msg.body}`;
                sendToTelegram(textoFormatado);
            }

        }
    } catch (err) {
        console.error("Erro ao processar mensagem:", err);
    }
});
