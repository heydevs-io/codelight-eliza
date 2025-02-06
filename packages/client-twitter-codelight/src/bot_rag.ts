import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use require to import CommonJS modules
const util = require('util');
const combinedStream = require('combined-stream');
const formData = require('form-data');

const x_app_code = process.env.X_APP_CODE;

async function getDifyToken(): Promise<string> {
    console.log("hello");
    console.log("x_app_code:", x_app_code);
    const response = await axios.post('https://dev.dify-api.nimspace.com/v1/codelight/passport', {
        email: "test@test.com",
        }, {
            headers: {
                'X-app-code': x_app_code, // App code in the headers
                'Content-Type': 'application/json'
            }
        }
    );

    console.log("response:", response.data);
    return response.data.access_token;
}

export async function callDifyAI(message: string): Promise<string> {
    try {
        const token = await getDifyToken();
        console.log("token:", token);
        // const response = await axios.post('https://api.dify.ai/your-endpoint', {
        //     message: message,
        //     // Add any other necessary parameters here
        // }, {
        //     headers: {
        //         'Authorization': 'Bearer YOUR_API_KEY',
        //         'Content-Type': 'application/json'
        //     }
        // });

        // return response.data.reply;
        return "Hiiillo";
    } catch (error) {
        console.error('Error calling Dify AI API:', error);
        throw new Error('Failed to get response from Dify AI');
    }
} 