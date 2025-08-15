// netlify/functions/process-ocr.js
const fetch = require('node-fetch'); // node-fetch is available in Netlify Functions runtime

exports.handler = async function(event, context) {
    // Hardcoded Client ID and Client Secret
    const CLIENT_ID = "partner-demotest-sso-sandbox";
    const CLIENT_SECRET = "pr42jmfddaQnozhwzwW7utDkWi3vAhER";

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Method Not Allowed" }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        // We now only expect the ocrPayload from the frontend, no accessToken needed
        const { ocrPayload } = JSON.parse(event.body);

        if (!ocrPayload || !ocrPayload.payload || !ocrPayload.payload.idFrontSideImage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "OCR payload or image is missing" }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // --- Step 1: Authenticate and get Access Token ---
        const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenUrl = 'https://qa-sso.vida.id/auth/realms/vida/protocol/openid-connect/token';
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('scope', 'roles');

        const authResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (!authResponse.ok) {
            const authErrorData = await authResponse.json();
            console.error("Authentication Error from VIDA SSO:", authErrorData);
            return {
                statusCode: authResponse.status,
                body: JSON.stringify({ error: `Authentication failed: ${authErrorData.error_description || JSON.stringify(authErrorData)}` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        const authData = await authResponse.json();
        const accessToken = authData.access_token;
        // --- End Step 1 ---

        // --- Step 2: Proceed with OCR API call using the obtained Access Token ---
        const ocrApiUrl = 'https://my-services-sandbox.np.vida.id/api/v1/verify/summary';

        const response = await fetch(ocrApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` // Use the dynamically obtained access token
            },
            body: JSON.stringify(ocrPayload) // Send the full OCR payload received from frontend
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetails = data.error_description || JSON.stringify(data);
            console.error("OCR API Call Error:", data);
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
        console.error("Netlify OCR Function Error (catch block):", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};

