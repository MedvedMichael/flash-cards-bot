const fs = require('fs')
const { resolve } = require('path')
const path = './cards.json'
const insertCards = (username, text) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    data = '[]'
                    fs.writeFile(path, '[]', function () { });
                }

            }
            try {
                const collections = JSON.parse(data.toString())
                const index = collections.findIndex((collection => collection.username === username))
                let currentCollection = index === -1 ? null : collections.splice(index, 1)[0]
                let counter = 0
                text.split('\n').forEach(line => {
                    const parts = line.split(' - ')
                    if (parts.length !== 2)
                        return
                    counter++;
                    if (currentCollection) {
                        const struggledIndex = currentCollection.cards.struggled.findIndex(item => item.word === parts[0])
                        const knowItIndex = currentCollection.cards.knowIt.findIndex(item => item.word === parts[0])
                        if (struggledIndex !== -1)
                            currentCollection.cards.struggled[struggledIndex].definition = parts[1]
                        else if (knowItIndex !== -1)
                            currentCollection.cards.knowIt[knowItIndex].definition = parts[1]

                        else currentCollection.cards.struggled.push({
                            word: parts[0],
                            definition: parts[1]
                        })
                    }
                    else {
                        currentCollection = {
                            username,
                            cards: {
                                struggled: [
                                    {
                                        word: parts[0],
                                        definition: parts[1]
                                    }
                                ],
                                knowIt: []
                            }
                        }
                        // userCards.push(currentCollection)
                    }
                })
                if(currentCollection)
                    collections.push(currentCollection)
                fs.writeFile(path, JSON.stringify(collections), () => resolve(counter))

            }
            catch (error) {
                reject(error)
                console.log(error)
            }
        })
    })
}

const getCollectionOfCards = (username) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    fs.writeFile(path, '[]', () => { });
                    data = '[]'
                }
            }
            try {
                const collections = JSON.parse(data)
                resolve(collections.find(collection => collection.username === username))
            }
            catch (error) {
                reject(error)
                console.log(error)
            }
        })
    })


}

const saveData = (collection) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                console.log(err)
                return reject()
            }
            try {
                const collections = JSON.parse(data)
                collections[collections.findIndex(item => item.username === collection.username)] = collection
                fs.writeFile(path, JSON.stringify(collections), () => resolve())
            }
            catch (error) {
                console.log(error)
                reject()
            }
        })
    })
}

const deleteCollection = (username) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                console.log(err)
                return reject()
            }

            try {
                const collections = JSON.parse(data)
                collections.splice(collections.findIndex(item => item.username === username), 1)
                fs.writeFile(path, JSON.stringify(collections), () => resolve())
            }
            catch (error) {
                console.log(error)
                reject()
            }
        })
    })
}

module.exports = { insertCards, getCollectionOfCards, saveData, deleteCollection }