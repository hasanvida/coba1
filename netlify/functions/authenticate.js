// netlify/functions/authenticate.js
const fetch = require('node-fetch'); // node-fetch is available in Netlify Functions runtime

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Method Not Allowed" }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        // Parse the request body coming from the frontend
        const { clientId, clientSecret } = JSON.parse(event.body);

        if (!clientId || !clientSecret) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing Client ID or Client Secret" }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenUrl = 'https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token';

        // Prepare the form data for the VIDA API
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('scope', 'roles');

        // Make the request to the VIDA API from the Netlify Function
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            // If the VIDA API returned an error, pass it back to the client
            const errorDetails = data.error_description || JSON.stringify(data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Authentication failed at VIDA API: ${errorDetails}` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // If successful, return the VIDA API response
        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error("Netlify Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};



