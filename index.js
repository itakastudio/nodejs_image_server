const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require("cors");
const db = require('./database');
const app = express();
app.use(cors());

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

/**
 * Get the final destination url after all redirection occur in the original url.
 * If any error in process, return empty string as final destination url.
 * @param {string} url 
 * @returns final destination url after redirect
 */
async function getRedirectedUrl(url) {
    try {
        let response = await fetch(url, { redirect: 'follow' });
        console.log(`final url: ${response.url}`);
        return response.url;
    } catch (err) {
        console.log(err.message);
        return '';
    }
}

app.use('/img/:imgFile', async (req, res) => {
    const filename = req.params.imgFile;
    try {
        const result = await db.query(`SELECT file_type, data FROM image_data WHERE filename = '${filename}'`);
        if (result.rows.length > 0) {
            var img = Buffer.from(result.rows[0].data.split(',')[1], 'base64');
            res.writeHead(200, {
                'Content-Type': result.rows[0].file_type,
                'Content-Length': img.length
            });
            res.end(img);
        } else {
            // image not found
            let errMsg = `image not found: ${filename}`;
            console.log(errMsg);
            res.status(400).send(errMsg);
            return;
        }
    } catch (err) {
        let errMsg = `Error: ${err.message}`;
        console.log(errMsg);
        res.status(400).send(errMsg);
        return;
    }
});

app.get('/', async (req, res) => {
    const allowFileType = ['image/jpg', 'image/jpeg', 'image/png'];

    let imageUrl = req.query.img;
    console.log(imageUrl);
    if (imageUrl == undefined || imageUrl == '') {
        let errMsg = 'Invalid target url';
        console.log(errMsg)
        res.status(400).send(errMsg);
        return;
    }

    // find final distination url if the target url is redirected
    imageUrl = await getRedirectedUrl(imageUrl);
    if (imageUrl == '') {
        let errMsg = 'getRedirectedUrl return empty url';
        console.log(errMsg);
        res.status(400).send(errMsg);
        return;
    }

    try {
        // get the file content from url
        const response = await fetch(imageUrl);
        const blob = await response.arrayBuffer();
        const fileType = response.headers.get("content-type");
        // check file type
        if (!allowFileType.includes(fileType)) {
            let errMsg = `Target Url file type invalid: ${fileType} received`;
            console.log(errMsg);
            res.status(400).send(errMsg);
            return;
        }

        let imageBase64 = `data:${fileType};base64,${Buffer.from(blob).toString("base64")}`;
        // console.log(imageBase64);

        // generate file name
        const imageName = `${Date.now()}_${getRandomInt(100)}.jpg`;
        const resultUrl = `${req.protocol}://${req.get('host')}/img/${imageName}`;
        // console.log(imageName);
        console.log(resultUrl);

        // store file into database
        await db.query(`INSERT INTO image_data(filename, file_type, data) VALUES ($1, $2, $3)`, [imageName, fileType, imageBase64]);

        res.status(200).send(resultUrl);
    } catch (err) {
        let errMsg = `Error: ${err.message}`;
        console.log(errMsg);
        res.status(400).send(errMsg);
        return;
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Now listening on port ${process.env.PORT}`);
});