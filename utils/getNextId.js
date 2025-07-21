const mongoose = require('mongoose');



async function getNextId(branchId, collectionName) {
    try {
        const counterCollection = mongoose.connection.collection('counters');

        // Find the branch document
        const result = await counterCollection.findOne(
            { _id: branchId, "collections.collectionName": collectionName },
            { projection: { "collections.$": 1 } }
        );

        if (!result) {
            // If branch or collection counter doesn't exist, initialize it
            await counterCollection.updateOne(
                { _id: branchId },
                {
                    $push: {
                        collections: {
                            collectionName,
                            next_id: 1
                        }
                    }
                },
                { upsert: true }
            );
            return '000001';
        }

        // Retrieve the next_id from the matched collection object
        const collectionCounter = result.collections[0];

        return collectionCounter.next_id.toString().padStart(6, '0');
    } catch (error) {
        console.error('Error in getNextId:', error);
        throw error;
    }
}



async function incrementCounter(branchId, collectionName) {
    try {
        const counterCollection = mongoose.connection.collection('counters');

        const result = await counterCollection.updateOne(
            {
                _id: branchId,
                "collections.collectionName": collectionName
            },
            {
                $inc: { "collections.$[elem].next_id": 1 } // Correctly increment within array
            },
            {
                arrayFilters: [{ "elem.collectionName": collectionName }]
            }
        );

        if (result.matchedCount === 0) {
            console.error('No matching document found for increment');
        }
    } catch (error) {
        console.error('Error in incrementCounter:', error);
        throw error;
    }
}


module.exports = { getNextId, incrementCounter };
