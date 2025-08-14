// netlify/functions/authenticate.js
const fetch = require('node-fetch'); // Node.js fetch equivalent for serverless functions

exports.handler = async function(event, context) {
    // Ensure this function only responds to POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // Retrieve sensitive credentials from Netlify Environment Variables
    // These variables must be set in your Netlify site settings under:
    // Build & deploy > Environment variables
    const CLIENT_ID = process.env.VITE_AUTH_CLIENT_ID; // Use VITE_ prefix for Vite/Netlify build
    const CLIENT_SECRET = process.env.VITE_AUTH_CLIENT_SECRET; // Use VITE_ prefix for Vite/Netlify build
    const AUTH_API_URL = 'https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token';

    // Basic validation for environment variables
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Environment variables VITE_AUTH_CLIENT_ID or VITE_AUTH_CLIENT_SECRET are not set.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server configuration error: Authentication credentials missing.' }),
        };
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('scope', 'roles');
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);

    try {
        // Make the actual authentication request to the Vida API
        const response = await fetch(AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        // Check if the authentication was successful and an access token was received
        if (response.ok && data.access_token) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    // Allow CORS from any origin for the Netlify function itself.
                    // For production, you might want to restrict this to your specific Netlify site's domain
                    // e.g., "Access-Control-Allow-Origin": "https://your-site-name.netlify.app"
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify({ access_token: data.access_token }),
            };
        } else {
            // Log the error from the external API for debugging
            console.error('Authentication API responded with an error:', data);
            return {
                statusCode: response.status || 500, // Use the API's status code or a generic 500
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify({ message: data.error_description || data.message || 'Authentication failed at external API.' }),
            };
        }
    } catch (error) {
        // Handle any network or internal errors during the function execution
        console.error('Netlify Function error during authentication:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ message: `Internal server error: ${error.message}` }),
        };
    }
};
