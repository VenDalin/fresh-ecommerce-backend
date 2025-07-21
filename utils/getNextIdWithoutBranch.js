const mongoose = require('mongoose');

async function getNextIdWithoutBranch(collectionName) {
    try {
        // Access the counter collection
        const counterCollection = mongoose.connection.collection('countersWithoutBranch');

        // Attempt to find the counter for the given collectionName
        const result = await counterCollection.findOne({ _id: collectionName });

        // If the document does not exist, create it and set seq to 1
        if (!result) {
            await counterCollection.insertOne({ _id: collectionName, seq: 1 }); // insert the document with sequence number 1
            return '000001'; // Return the first ID with leading zeros
        }

        // Return the current sequence (will increment it later)
        return result.seq.toString().padStart(6, '0');
    } catch (error) {
        console.error('Error in getNextId:', error);
        throw error;
    }
}

async function incrementCounterWithoutBranch(collectionName) {
    const counterCollection = mongoose.connection.collection('countersWithoutBranch');

    // Increment the sequence number
    await counterCollection.findOneAndUpdate(
        { _id: collectionName },
        { $inc: { seq: 1 } }, // increment the sequence number
        { returnDocument: 'after' } // return the updated document
    );
}

module.exports = { getNextIdWithoutBranch, incrementCounterWithoutBranch };
