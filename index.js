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

//Verification JSON WEB Token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unAuthorized access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ mesage: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run(){
    try{
        await client.connect();
        const userCollection = client.db("AORUS_WORLD").collection("users");
        const productCollection = client.db("AORUS_WORLD").collection("products");
        console.log("DB Connected");

        //Verify Admin
        const verifyAdmin = async(req, res, next) => {
            const requester = req.decoded.email;
            const requsterAccount = await userCollection.findOne({email: requester});
            console.log(requsterAccount);
            if(requsterAccount.role === "admin"){
                next();
            }
            else{
                res.status(403).send({message: "forbidden Access"})
            }
        }

        //ALL GET API

        //get all users information with this API
        app.get('/users',verifyJWT, async(req, res)=> {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        //get all product data
        app.get("/parts", verifyJWT, async (req, res)=> {
            const result = await productCollection.find({}).toArray();
            res.send(result)
        })


        //ALL POST API
        

        //ALL PUT API
        app.put('/user',  async (req, res)=> {
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

        //API for make admin
        app.put('/user/admin/:email',verifyJWT,verifyAdmin, async (req, res)=> {
            const email = req.params.email;
            const filter = {email: email};
            const updateDoc = {
                $set: {role: "admin"}
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
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