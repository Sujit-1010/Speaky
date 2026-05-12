const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
const connectDB = async (uri) => {
    await mongoose.connect(uri, { family: 4 });
};
module.exports = connectDB;
