const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const https = require('https');
const fs = require('fs');

const app = express();

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

app.use('/img', express.static('img'));

app.get('/', async (req, res) => {
    const imageUrl = req.query.img;
    const imageName = `./img/${Date.now()}_${getRandomInt(100)}.jpg`;
    const file = fs.createWriteStream(imageName);

    console.log(imageUrl);

    https.get(imageUrl, response => {
        response.pipe(file);

        file.on('finish', () => {
            const resultUrl = `${req.protocol}://${req.get('host')}${imageName.slice(1)}`;
            console.log(`Image stored at ${resultUrl}`);
            res.status(200).send(resultUrl);
            file.close();
        });
    }).on('error', err => {
        console.error(`Error downloading image: ${err.message}`);
        res.status(400).send(`Error downloading image: ${err.message}`);
        fs.unlink(imageName);
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Now listening on port ${process.env.PORT}`);
});