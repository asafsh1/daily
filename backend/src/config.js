module.exports = {
  // MongoDB Atlas URI from production environment
  mongoURI: "mongodb://asafasaf5347:asafasaf5347@ac-2pbbpry-shard-00-00.lyz67.mongodb.net:27017,ac-2pbbpry-shard-00-01.lyz67.mongodb.net:27017,ac-2pbbpry-shard-00-02.lyz67.mongodb.net:27017/shipment-tracker?ssl=true&replicaSet=atlas-14nsmx-shard-0&authSource=admin&retryWrites=true&w=majority",
  jwtSecret: "dailyshipping_jwt_secret_dev_token_key",
  port: process.env.PORT || 5000
}; 