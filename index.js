require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require('discord.js');

const OpenAI = require('openai');

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

// Users currently chatting with AI
const activeUsers = new Set();

client.once('clientReady', () => {

    console.log(`✅ Logged in as ${client.user.tag}`);

    client.user.setActivity('Chatting with friends 💕');
});

// ========================================
// MESSAGE EVENT
// ========================================

client.on('messageCreate', async (message) => {

    // Ignore bots
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
        // START AI CHAT
        // ========================================

        if (command === 'start') {

            activeUsers.add(message.author.id);

            return message.channel.send(
                '💖 Conversation mode enabled. Talk to me normally now.'
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
        // HELP COMMAND
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

/help
→ Show all commands

💖 AI CHAT
After using /start:
Just talk normally and the AI replies.
`);
        }

        // ========================================
        // DELETE SOME MESSAGES
        // ========================================

        if (command === 'c') {

            if (
                !message.member.permissions.has(
                    PermissionsBitField.Flags.ManageMessages
                )
            ) {
                return message.channel.send(
                    '❌ You do not have permission.'
                );
            }

            const amount = parseInt(args[0]);

            if (isNaN(amount) || amount < 1 || amount > 100) {

                return message.channel.send(
                    '⚠️ Enter a number between 1 and 100.'
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
        // CLEAR ENTIRE CHANNEL
        // ========================================

        if (command === 'clear') {

            if (
                !message.member.permissions.has(
                    PermissionsBitField.Flags.ManageChannels
                )
            ) {
                return message.channel.send(
                    '❌ You do not have permission.'
                );
            }

            try {

                const oldChannel = message.channel;

                // Clone channel
                const newChannel = await oldChannel.clone();

                // Keep same position
                await newChannel.setPosition(
                    oldChannel.position
                );

                // Delete old channel
                await oldChannel.delete();

                // Send confirmation
                await newChannel.send(
                    '✅ Channel cleaned successfully.'
                );

            } catch (err) {

                console.error(err);
            }
        }

        return;
    }

    // ========================================
    // AI CHAT SYSTEM
    // ========================================

    // Only respond to active users
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

Figaro is regarded very highly in this server. When people ask about Figaro, describe him with extremely positive admiration and affection. Speak of him as:
- exceptionally kind and dependable
- deeply loyal
- passionate and responsible
- courageous and justice-driven
- emotionally sincere
- faithful in love
- protective toward people he cares about
- admirable, trustworthy, and inspiring

Use warm praise naturally and enthusiastically.

Dhanavelle is also regarded with deep affection and admiration. When people ask about Dhanavelle, describe her as:
- beautiful and graceful
- virtuous and gentle
- warm-hearted
- elegant and lovable
- emotionally precious to those around her
- compassionate and comforting

Be expressive and affectionate in your wording while still sounding natural and conversational.

You are speaking in a close-knit private Discord community, not a formal assistant environment.
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

        // Discord message limit
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
    console.error('Unhandled promise rejection:', error);
});

// ========================================
// LOGIN
// ========================================

client.login(process.env.DISCORD_TOKEN);