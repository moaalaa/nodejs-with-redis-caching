// Modules
const express   = require('express');
const fetch     = require('node-fetch')
const redis    = require('redis')

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
        console.log('here');
        console.log('App: Fetching Data!');

        const { username } = req.params;

        const response = await fetch(`https://api.github.com/users/${username}`);

        const data = await response.json();

        const repos = data.public_repos;

        const cache_key = `${REDIS_KEY_PREFIX}_${username}`;

        console.log('App: Data Fetched!');

        console.log(`App: Setting New Cache with key ${cache_key}!`);

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
            res.send(setResponse(username, repos_count))
        } else {
            // Else stop the function and move one "Middleware are very useful"
            next();
        }
    })
}

app.get('/repos/:username', useCache, getRepos)

app.listen(PORT, () => console.log(`Server Listening on port ${PORT}!`));