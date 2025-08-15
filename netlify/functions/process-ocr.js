// netlify/functions/process-ocr.js
const fetch = require('node-fetch'); // node-fetch is available in Netlify Functions runtime

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Method Not Allowed" }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        const { accessToken, ocrPayload } = JSON.parse(event.body);

        if (!accessToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Access Token is missing" }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        if (!ocrPayload || !ocrPayload.payload || !ocrPayload.payload.idFrontSideImage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "OCR payload or image is missing" }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const ocrApiUrl = 'https://my-services-sandbox.np.vida.id/api/v1/verify/summary';

        const response = await fetch(ocrApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` // Use the provided access token
            },
            body: JSON.stringify(ocrPayload) // Send the full OCR payload received from frontend
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetails = data.error_description || JSON.stringify(data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `OCR API call failed: ${errorDetails}` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error("Netlify OCR Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
