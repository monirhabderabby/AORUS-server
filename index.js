const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
        const orderCollection = client.db("AORUS_WORLD").collection("orders");
        const reviewCollection = client.db("AORUS_WORLD").collection("reviews");
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

        //Stripe payment
        app.post("/create-payment-intent", async (req, res) =>{
            const order =req.body;
            const price = order.price;
            const amount = parseInt(price)*100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
              });

        })

        //ALL GET API

        //get all users information with this API
        app.get('/users',verifyJWT, async(req, res)=> {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        //get a single user by email
        app.get('/user/:email', async(req, res)=>{
            const email = req.params.email;
            const filter = {email: email};
            const result = await userCollection.findOne(filter);
            res.send(result)
        } )

        //get all product data
        app.get("/parts", async (req, res)=> {
            const result = await (await productCollection.find({}).toArray()).reverse();
            res.send(result)
        })

        //get all orders for admin
        app.get('/allorders', verifyJWT,verifyAdmin, async (req, res)=> {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result)
        })

        //Check Admin or not
        app.get('/user/checkAdmin/:email', async (req, res)=> {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === "admin"
            res.send({admin: isAdmin});
        })

        //Get a product using id
        app.get('/product/:id', verifyJWT, async (req, res)=> {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await productCollection.findOne(filter);
            res.send(result)
        })
        
        //Get a Order using Id
        app.get('/order/:id', verifyJWT, async (req, res)=> {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await orderCollection.findOne(filter);
            res.send(result)
        })

        //Get all products by user
        app.get('/orders/:email',verifyJWT, async (req, res)=> {
            const email = req.params.email;
            const filter = {email: email}
            const result = await (await orderCollection.find(filter).toArray()).reverse();
            res.send(result);
        })

        //get all review 
        app.get('/review', async (req, res)=> {
            const result = await (await reviewCollection.find().toArray()).reverse()
            res.send(result)
        })


        //ALL POST API
        //insert a product from admin
        app.post('/product',verifyJWT, async (req, res)=> {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        })

        //new order 
        app.post('/order',verifyJWT, async(req, res)=> {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        //make a api for post review on DB
        app.post('/review',verifyJWT, async (req, res)=> {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        



        //ALL PUT API
        app.put('/user',  async (req, res)=> {
            const user = req.body;
            const email = user?.email;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
                $set: user,
            }

            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET_KEY, {
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

        //Update user payment
        app.put('/order/paid/:id', async (req, res)=> {
            const id = req.params.id;
            const transactionId = req.body;
            const filter = {_id: ObjectId(id)}
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: transactionId,
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        //Update user Profile
        app.put('/profile/:email', async (req, res)=> {
            const email = req.params.email;
            const profile = req.body;
            const filter = {email: email};
            const updateDoc = {
                $set: {
                    birthDay : profile.age,
                    institutte: profile.institute,
                    parmanentAddress: profile.parmanentAddress,
                    presentAddress: profile.presentAddress,
                    img: profile.img
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //ALL DELETE API

        //Cancle Order
        app.delete('/order/:id', async (req, res)=> {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await orderCollection.deleteOne(filter);
            res.send(result)
        })
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