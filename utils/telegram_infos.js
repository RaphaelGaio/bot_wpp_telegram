const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs"); // Importamos o módulo para lidar com arquivos

// Seus dados (Mantenha-os seguros!)
const apiId = 31007764;
const apiHash = "2d195c1732e058bab69cf5fdc71e972a";

// Nome do arquivo onde a sessão será salva
const SESSION_FILE = "session.txt";

(async () => {
  console.log("🔄 Verificando sessão salva...");

  // 1. Carregar a sessão do arquivo se ele existir
  let stringSessionCifrada = "";
  if (fs.existsSync(SESSION_FILE)) {
    stringSessionCifrada = fs.readFileSync(SESSION_FILE, "utf8");
    console.log("✔ Sessão encontrada! Carregando...");
  } else {
    console.log("❌ Nenhuma sessão encontrada. Será necessário fazer login.");
  }

  // 2. Cria a instância da sessão com o código carregado (ou vazio)
  const stringSession = new StringSession(stringSessionCifrada);

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  // 3. Inicia o cliente (se a sessão for válida, ele não pede o número)
  await client.start({
    phoneNumber: async () => await input.text("📱 Digite seu número +DDD: "),
    password: async () => await input.text("🔐 Digite sua senha 2FA: "),
    phoneCode: async () => await input.text("✉ Digite o código do Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\n✔ CONECTADO COM SUCESSO!");

  // 4. Salva a sessão no arquivo para a próxima vez
  console.log("💾 Salvando sessão no arquivo...");
  fs.writeFileSync(SESSION_FILE, client.session.save());
  console.log(`✔ Sessão salva em '${SESSION_FILE}'. Não apague este arquivo!`);

  // --- AQUI COMEÇA A SUA LÓGICA DE BUSCAR OS IDs ---

  console.log("\n🔍 Buscando grupos, supergrupos, canais e chats...");

  const dialogs = await client.getDialogs();

  dialogs.forEach((d) => {
    const type = d.isChannel
      ? d.entity.megagroup
        ? "Supergrupo"
        : "Canal"
      : d.isGroup
      ? "Grupo"
      : "Privado";

    console.log(`\n📌 ${type}`);
    console.log(`Nome: ${d.name}`);
    console.log(`ID:   ${d.id}`);
  });

  console.log("\n🎉 Finalizado!");
  
  // Encerra o processo (opcional, mas bom para scripts que rodam uma vez)
  process.exit(0);
})();