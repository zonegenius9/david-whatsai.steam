// Firstly we need to add the dependencies
const {
    default: makeWASocket,
    DisconnectReason,
    useSingleFileAuthState
} = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./login.json");

//Here we add the openai code from chatgpt
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: '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',
});
const openai = new OpenAIApi(configuration);

//The function of the open ai chatgpt is to receive responce
async function generateResponse(text) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });
    return response.data.choices[0].text;
}

// The main function
async function connectToWhatsApp() {

    //Buat sebuah koneksi baru ke WhatsApp
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQuertTimeoutMs: undefined
    });

    sock.ev.on("message-new", async (message) => {
        const { jid, message: { conversation } } = message;

        // Only process messages that start with "-whatsai"
        if (conversation && conversation.startsWith("-whatsai")) {
            try {
                const input = conversation.substring(9);
                const response = await generateResponse(input);
                await sock.sendMessage(jid, response, { quoted: message });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(jid, "Oops, something went wrong!", { quoted: message });
            }
        }
    });
    //The function to mantain update (what is going on)
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connection lost because ", lastDisconnect.error, ", connect again!", shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
        else if (connection === "open") {
            console.log("Connected!")
        }
    });
    sock.ev.on("creds.update", saveState);

    //Function to see the message coming in
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        console.log("Tipe Pesan: ", type);
        console.log(messages);
        if (type === "notify" && !messages[0].key.fromMe) {
            try {

                //Get the person phone number and his message
                const senderNumber = messages[0].key.remoteJid;
                let incomingMessages = messages[0].message.conversation;
                if (incomingMessages === "") {
                    incomingMessages = messages[0].message.extendedTextMessage.text;
                }
                incomingMessages = incomingMessages.toLowerCase();

                //From this function we can know if this message is from the group or not
                //And if the message mention the bot or not
                const isMessageFromGroup = senderNumber.includes("@g.us");
                const isMessageMentionBot = incomingMessages.includes("@6282126083338");

                //Show the sender number and his requested message
                console.log("Sender Number:", senderNumber);
                console.log("His or Her message:", incomingMessages);

                //Tampilkan Status Pesan dari Grup atau Bukan
                //Tampilkan Status Pesan Mengebut Bot atau Tidak
                console.log("Apakah Pesan dari Grup? ", isMessageFromGroup);
                console.log("Apakah Pesan Menyebut Bot? ", isMessageMentionBot);

                //Dm bot
                if (!isMessageFromGroup) {

                    //Jika ada yang mengirim pesan mengandung kata 'siapa'
                    if (incomingMessages.includes('who are you')) {
                        await sock.sendMessage(
                            senderNumber,
                            { text: "I am WhatsAI" },
                            { quoted: messages[0] },
                            2000
                        );
                    } else if (incomingMessages.includes('who r you')) {
                            await sock.sendMessage(
                                senderNumber,
                                { text: "I am WhatsAI" },
                                { quoted: messages[0] },
                                2000
                            );
                    } else if (incomingMessages.includes('who created you')) {
                        await sock.sendMessage(
                            senderNumber,
                            { text: "I was created by David, Dylan, and Denzel for our steam project" },
                            { quoted: messages[0] },
                            2000
                        );
                    } else if (incomingMessages.includes('halo')) {
                        await sock.sendMessage(
                            senderNumber,
                            { text: "Hello I am WhatsAI" },
                            { quoted: messages[0] },
                            2000
                        );
                    } else {
                        async function main() {
                            const result = await generateResponse(incomingMessages);
                            console.log(result);
                            await sock.sendMessage(
                                senderNumber,
                                { text: result + "\n\n" },
                                { quoted: messages[0] },
                                2000
                            );
                        }
                        main();
                    }
                }

                //Kalo misalkan nanya via Group
                if (isMessageFromGroup && isMessageMentionBot) {
                    //Jika ada yang mengirim pesan mengandung kata 'siapa'
                    if (incomingMessages.includes('who are') && incomingMessages.includes('you')) {
                        await sock.sendMessage(
                            senderNumber,
                            { text: "Hi I'm WhatsAI The Chatbot!" },
                            { quoted: messages[0] },
                            2000
                        );
                    } else {
                        async function main() {
                            const result = await generateResponse(incomingMessages);
                            console.log(result);
                            await sock.sendMessage(
                                senderNumber,
                                { text: result + "\n\n" },
                                { quoted: messages[0] },
                                2000
                            );
                        }
                        main();
                    }
                }



            } catch (error) {
                console.log(error);
            }
        }
    });

}

connectToWhatsApp().catch((err) => {
    console.log("Ada Error: " + err);
});


