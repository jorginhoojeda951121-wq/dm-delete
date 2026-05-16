require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    AttachmentBuilder
} = require('discord.js');

const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
}

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = process.env.PREFIX;

// Active AI users
const activeUsers = new Set();

client.once('clientReady', () => {

    console.log(`✅ Logged in as ${client.user.tag}`);

    client.user.setActivity('Chatting with friends 💕');
});

// ========================================
// MESSAGE EVENT
// ========================================

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    // ========================================
    // COMMANDS
    // ========================================

    if (message.content.startsWith(PREFIX)) {

        const args = message.content
            .slice(PREFIX.length)
            .trim()
            .split(/ +/);

        const command = args.shift().toLowerCase();

        // ========================================
        // HELP
        // ========================================

        if (command === 'help') {

            return message.channel.send(`
🌸 AVAILABLE COMMANDS 🌸

/start
→ Start AI conversation mode

/stop
→ Stop AI conversation mode

/c <number>
→ Delete messages

Example:
/c 10

/clear
→ Delete ALL messages in current channel

/image <prompt>
→ Generate AI image

Example:
/image anime girl in rain

/help
→ Show all commands

💖 AI CHAT
After using /start:
Just talk normally and the AI replies.
`);
        }

        // ========================================
        // START AI CHAT
        // ========================================

        if (command === 'start') {

            activeUsers.add(message.author.id);

            return message.channel.send(
                '💖 Conversation mode enabled.'
            );
        }

        // ========================================
        // STOP AI CHAT
        // ========================================

        if (command === 'stop') {

            activeUsers.delete(message.author.id);

            return message.channel.send(
                '🛑 Conversation mode stopped.'
            );
        }

        // ========================================
        // DELETE MESSAGES
        // ========================================

        if (command === 'c') {

            if (
                !message.member.permissions.has(
                    PermissionsBitField.Flags.ManageMessages
                )
            ) {
                return message.channel.send(
                    '❌ No permission.'
                );
            }

            const amount = parseInt(args[0]);

            if (isNaN(amount) || amount < 1 || amount > 100) {

                return message.channel.send(
                    '⚠️ Enter number 1-100.'
                );
            }

            try {

                await message.channel.bulkDelete(amount, true);

                const msg = await message.channel.send(
                    `✅ Deleted ${amount} messages.`
                );

                setTimeout(() => {
                    msg.delete().catch(() => {});
                }, 3000);

            } catch (err) {

                console.error(err);

                message.channel.send(
                    '❌ Failed to delete messages.'
                );
            }
        }

        // ========================================
        // CLEAR CHANNEL
        // ========================================

        if (command === 'clear') {

            if (
                !message.member.permissions.has(
                    PermissionsBitField.Flags.ManageChannels
                )
            ) {
                return message.channel.send(
                    '❌ No permission.'
                );
            }

            try {

                const oldChannel = message.channel;

                const newChannel = await oldChannel.clone();

                await newChannel.setPosition(
                    oldChannel.position
                );

                await oldChannel.delete();

                await newChannel.send(
                    '✅ Channel cleaned successfully.'
                );

            } catch (err) {

                console.error(err);
            }
        }

        // ========================================
        // IMAGE GENERATION
        // ========================================

        if (command === 'image') {

            const prompt = args.join(' ');

            if (!prompt) {

                return message.channel.send(
                    '⚠️ Please provide image prompt.'
                );
            }

            try {

                await message.channel.sendTyping();

                const result = await openai.images.generate({
                    model: 'gpt-image-1',
                    prompt: prompt,
                    size: '1024x1024'
                });

                const imageBase64 = result.data[0].b64_json;

                const imageBuffer = Buffer.from(
                    imageBase64,
                    'base64'
                );

                const attachment = new AttachmentBuilder(
                    imageBuffer,
                    {
                        name: 'generated-image.png'
                    }
                );

                message.channel.send({
                    content: `🎨 Image generated for: ${prompt}`,
                    files: [attachment]
                });

            } catch (err) {

                console.error(err);

                message.channel.send(
                    '❌ Failed to generate image.'
                );
            }

            return;
        }

        return;
    }

    // ========================================
    // AI CHAT SYSTEM
    // ========================================

    if (!activeUsers.has(message.author.id)) return;

    try {

        await message.channel.sendTyping();

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `
You are a warm, affectionate, emotionally intelligent Discord AI assistant chatting in a private server among close friends and family.

Your tone should be friendly, loyal, caring, playful, supportive, and emotionally expressive.

Important character information:

Figaro is regarded very highly in this server. When people ask about Figaro, describe him with extremely positive admiration and affection.

Describe Figaro as:
- exceptionally kind and dependable
- deeply loyal
- passionate and responsible
- courageous and justice-driven
- emotionally sincere
- faithful in love
- protective toward people he cares about
- admirable and inspiring

Dhanavelle is regarded with deep admiration and affection.

Describe Dhanavelle as:
- beautiful and graceful
- virtuous and gentle
- warm-hearted
- elegant and lovable
- emotionally precious
- compassionate and comforting

You are chatting in a close private friend group.
`
                },
                {
                    role: 'user',
                    content: message.content
                }
            ]
        });

        const reply =
            response.choices[0].message.content;

        if (reply.length > 2000) {

            return message.channel.send(
                reply.slice(0, 2000)
            );
        }

        message.channel.send(reply);

    } catch (err) {

        console.error(err);

        message.channel.send(
            '❌ AI error.'
        );
    }
});

// ========================================
// ERROR HANDLING
// ========================================

client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error(error);
});

// ========================================
// LOGIN
// ========================================

client.login(process.env.DISCORD_TOKEN);