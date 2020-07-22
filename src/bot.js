const TelegramBot = require('node-telegram-bot-api')
const { insertCards, getCollectionOfCards, saveData, deleteCollection } = require('./flash-card-menu')
const e = require('express')
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })
const states = []
const menuButtons = {
    "reply_markup": {
        "keyboard": [['Insert cards✅', 'Start learning😉'], ['See all my cards👀', 'Delete my collections❌']]
    }
}

const movingButtons = {
    "reply_markup": {
        "keyboard": [["Know it😊", "Don't know😔"]]
    }
}

const choosingButtons = {
    "reply_markup": {
        "keyboard": [["Next➡️", "Stop🛑"]]
    }
}

bot.onText(/\/start/, async msg => {
    const chatId = msg.chat.id
    const userName = msg.from.first_name
    const text =
        `Welcome, ${userName}!
This bot is created by @medved2001 for people who want to learn English using flash-cards :)))
You are automatically registered, use buttons to go through the menu
Good luck)`

    await bot.sendMessage(chatId, text, menuButtons)
    await bot.sendMessage(chatId, 'Choose what to do😊', menuButtons)
});

bot.on('message', msg => {
    triggerMenu(msg)
})

const sendDefaultMessage = async (chatId) => await bot.sendMessage(chatId, 'Choose what to do😊', menuButtons)

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
    return array
}

const triggerMenu = async msg => {
    const text = msg.text.toString()
    const chatId = msg.chat.id
    if (text.charAt(0) === '/')
        return
    const { username } = msg.from
    let state = states.find(state => state.username === username)
    if (!state) {
        state = { username }
        switch (text) {
            case 'Insert cards✅':
                try {
                    await bot.sendMessage(msg.chat.id, 'Input all necessary cards like "word - definition"',{
                        'reply_markup':{
                            remove_keyboard: true
                        }
                    })
                    state.currentContext = 'inserting'
                    return states.push(state)
                }
                catch (error) {
                    console.log(error)
                    return await sendDefaultMessage(chatId)
                }

            case 'Start learning😉':
                try {
                    await bot.sendMessage(chatId, "Okay, now you will see some words, write their definitions if you know, then check if you know the word correctly. If you don't know the word, push the 'Don't know' button, else push 'Know it' button")
                    state.currentContext = 'learning'
                    const collection = await getCollectionOfCards(username)
                    state.collection = collection
                    if (!collection) {
                        await bot.sendMessage(chatId, `You have no words yet, try 'Insert cards✅' button first`)
                        return await sendDefaultMessage(chatId)
                    }
                    state.generatedArray = [...shuffle([...collection.cards.struggled]), ...shuffle([...collection.cards.knowIt])]
                    states.push(state)
                    return triggerMenu(msg);
                }
                catch (error) {
                    console.log(error)
                }

            case 'Delete my collections❌':
                try {
                    await deleteCollection(msg.from.username)
                    await bot.sendMessage(chatId, "Deleted!")
                }
                catch (error) {
                    console.log(error)

                } finally {
                    return await sendDefaultMessage(chatId)
                }
            case 'See all my cards👀':
                try {
                    const res = await getCollectionOfCards(username)
                    if (!res) 
                        return await bot.sendMessage(chatId, 'Insert some cards first...')
                    
                    const { struggled, knowIt } = res.cards
                    const reducer = (result, current) => result + '  <strong>' + current.word + '</strong> - ' + current.definition + '\n'
                    const text = '<strong><i>Struggled😔:</i></strong> \n' + struggled.reduce(reducer, '') + '<strong><i>Know it😊:</i></strong> \n' + knowIt.reduce(reducer, '')
                    await bot.sendMessage(chatId, text, {
                        "parse_mode": "HTML"
                    })
                }
                catch (error) {
                    console.log(error)
                }
                finally {
                    return await sendDefaultMessage(chatId)
                }
            default:
                await bot.sendMessage(chatId, "Use given buttons to use the bot correctly :)", menuButtons)
                return await sendDefaultMessage(chatId)
        }

    }

    else {
        const { currentContext, card } = state
        if (currentContext === 'inserting') {
            const numberOfSavedCards = await insertCards(msg.from.username, msg.text.toString())
            await bot.sendMessage(chatId, `Saved ${numberOfSavedCards} cards!`)
            await bot.sendMessage(chatId, 'Choose what to do😊', menuButtons)
            states.splice(states.findIndex(item => item === state), 1)
        }
        else if (currentContext === 'moving') {
            if (text !== 'Know it😊' && text !== "Don't know😔")
                return await bot.sendMessage(chatId, "Use given buttons to use the bot correctly :)", movingButtons);
            const choice = text === 'Know it😊'

            const struggledIndex = state.collection.cards.struggled.findIndex(item => item === card)
            const knowItIndex = state.collection.cards.knowIt.findIndex(item => item === card)
            if (choice && struggledIndex !== -1) {
                state.collection.cards.struggled.splice(struggledIndex, 1)
                state.collection.cards.knowIt.push(card)
            }
            else if (!choice && knowItIndex !== -1) {
                state.collection.cards.knowIt.splice(knowItIndex, 1)
                state.collection.cards.struggled.push(card)
            }

            state.card = null
            state.currentContext = 'choosing'
            await bot.sendMessage(chatId, "Saved!\nDo you want to continue?)", choosingButtons)
        }
        else if (currentContext === 'choosing') {

            if (text === 'Next➡️') {
                state.currentContext = 'learning'
                return triggerMenu(msg)
            }
            else if (text === 'Stop🛑') {
                await saveData(state.collection)
                states.splice(states.findIndex(item => item === state), 1)
                await bot.sendMessage(chatId, "Choose what to do😊", menuButtons)
            }
            else await bot.sendMessage(chatId, "Use given buttons to use the bot correctly :)", choosingButtons)

        }

        else if (currentContext === 'learning') {
            if (!card) {
                try {
                    if (state.generatedArray.length === 0) {
                        states.splice(states.findIndex(item => item === state), 1)
                        return await bot.sendMessage(chatId, "There're no words left, add new words first", menuButtons)
                    }
                    const newCard = state.generatedArray.splice(0, 1)[0]
                    state.card = newCard
                    await bot.sendMessage(chatId, `Word: ${newCard.word}\nWrite your definition`, {
                        "reply_markup": {
                            remove_keyboard: true
                        }
                    })
                }
                catch (error) {
                    console.log(error)
                }
            }
            else {
                state.currentContext = 'moving'
                await bot.sendMessage(chatId,
                    `Compare your answer to the definition I have:
Your answer: ${text}
Definition: ${card.definition}
Push the button to put this card to correct stack`, movingButtons)
            }
        }
    }
}

