const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
const connectDB = async (uri) => {
    await mongoose.connect(uri);
};
module.exports = connectDB;
