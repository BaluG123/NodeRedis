const express = require('express');
const app = express();
const axios = require('axios');
const redis = require('redis');
const port = 5000;

let redisClient;
(async()=>{
    redisClient = redis.createClient();
    redisClient.on("error",(error)=>console.error(`Error: ${error}`))
    await redisClient.connect();
})();

async function fetchApiData(standard){
    const apiResponse =await axios.get(
        `http://localhost:3000/api/vehiclemodels/brand/${standard}`
    );
    console.log('request sent to API');
    return apiResponse.data;
}

async function cacheData(req, res, next) {
  const standard = req.params.standard;
  let results;
  try {
    const cacheResults = await redisClient.get(standard);
    if (cacheResults) {
      results = JSON.parse(cacheResults);
      res.send({
        fromCache: true,
        data: results,
      });
    } else {
      next();
    }
  } catch (error) {
    console.error(error);
    res.status(404);
  }
}

async function getQuizData(req, res) {
  const standard = req.params.standard;
  let results;

  try {
    results = await fetchApiData(standard);
    if (results.length === 0) {
      throw "API returned an empty array";
    }
    await redisClient.set(standard, JSON.stringify(results), {
      EX: 180,
      NX: true,
    });

    res.send({
      fromCache: false,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("Data unavailable");
  }
}


app.get('/quiz/:standard',cacheData,getQuizData)

app.listen(port,()=>{
    console.log(`server is running on port ${port}`)
})