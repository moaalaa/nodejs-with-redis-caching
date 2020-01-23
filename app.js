// Modules
const express   = require('express');
const fetch     = require('node-fetch');
const redis     = require('redis');
const chalk     = require('chalk');

// Configs
const PORT          = process.env.PORT || 5000;
const REDIS_PORT    = process.env.REDIS_PORT || 6379;
const REDIS_KEY_PREFIX    = process.env.REDIS_KEY_PREFIX || 'node_app_with_redis_caching';

const client = redis.createClient(REDIS_PORT);

const app = express();

// Set Response
const setResponse = (username, repos) => {
    return `<h2>${username} Has ${repos} github repos</h2>`
}

// Make Request to github and get repos count
const getRepos = async (req, res) => {
    try {
        console.log(chalk.cyan('App: Fetching Data!'));

        const { username } = req.params;

        const response = await fetch(`https://api.github.com/users/${username}`);

        const data = await response.json();

        const repos = data.public_repos;

        const cache_key = `${REDIS_KEY_PREFIX}_${username}`;

        console.log(chalk.greenBright('App: Data Fetched!'));

        console.log(chalk.cyan(`App: Setting New Cache with key ${cache_key}!`));

        // Set Data To Redis For Caching
        // "setex" putting data with expiration
        // Expirations in seconds so "3600" Equal 1 hour
        client.setex(`${cache_key}`, 3600, repos);

        res.send(setResponse(username, repos));
        
    } catch (error) {
        console.error(error);
        res.status(500);
    }
}

// Cache Middleware
const useCache = (req, res, next) => {
    const { username } = req.params;
    
    const cache_key = `${REDIS_KEY_PREFIX}_${username}`;

    client.get(cache_key, (err, repos_count) => {
        if (err) throw err;

        // If Repos Count Is Not Null (Exists)
        if (repos_count !== null) {
            // Send the proper response
            console.log(chalk.green('App: Retrieving From Cache'));
            
            res.send(setResponse(username, repos_count))
        } else {
            // Else stop the function and move one "Middleware are very useful"
            next();
        }
    })
}

app.get('/', (req, res) => {
    res.json({
        message: 'Hello',
        usage: 'just go to /repos/:username',
        notes: ':username is wild card change it with any github user name'
    })
})

app.get('/repos/:username', useCache, getRepos)

app.listen(PORT, () => console.log(`Server Listening on port ${PORT}!`));