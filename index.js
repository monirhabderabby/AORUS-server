const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//MongoDB 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@aorus.lxgn5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const userCollection = client.db("AORUS_WORLD").collection("users");
        console.log("DB Connected");

        //ALL GET API


        //ALL POST API
        

        //ALL PUT API
        app.put('/user', async (req, res)=> {
            const user = req.body;
            const filter = {email: user.email};
            const options = {upsert: true};
            const updateDoc = {
                $set: user,
            }

            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email: user.email}, process.env.ACCESS_TOKEN_SECRET_KEY, {
                expiresIn: "1d"
            })
            res.send({result, token})
        })

        //ALL DELETE API
    }
    finally{

    }
}


run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello From AORUS WORLD!");
});

app.listen(port, () => {
    console.log(`AORUS listening on port ${port}`);
});