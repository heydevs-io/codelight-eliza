import { createRequire } from 'module';
//import { HttpService } from '@nestjs/axios';
//import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { Tweet } from 'agent-twitter-client';
const require = createRequire(import.meta.url);

// Use require to import CommonJS modules
const util = require('util');
const combinedStream = require('combined-stream');
const formData = require('form-data');

const x_app_code = process.env.X_APP_CODE;

async function getDifyToken(): Promise<string> {
    console.log("hello");
    console.log("x_app_code:", x_app_code);
    const response = await fetch(   
          'http://dev.dify-api.nimspace.com/v1/codelight/passport',
          {
            method: 'POST',
            body: JSON.stringify({
                email: "test@test.com"
            }),
            headers: {
              'X-App-Code': 'lWJvpl9H8RtZXV2b',
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
            }
          }
        );
    const data = await response.json(); // Resolve the promise
    console.log("data:", data);
    const accessToken = data.access_token; // Access the access_token property
    console.log("accessToken:", accessToken);
    return accessToken;
}

export async function callDifyAI(context: string, conversationId: string, messageId: string): Promise<any> {
    try {
        const accessToken = await getDifyToken();
        console.log("accesstoken:", accessToken);
        console.log("context:", context);
        const response = await fetch('http://dev.dify-api.nimspace.com/api/chat-messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response_mode: "blocking",
                conversation_id: conversationId,
                files: [],
                query: context,
                inputs: {
                    chat_history: ""
                },
                parent_message_id: messageId
            }),
        }
        );
        console.log("response status:", response.status);
        const data = await response.json();
        console.log("response:", data);
        //tweet.messageId_Dify = data.message_id;

        //return response.data.reply;
        return data;
    } catch (error) {
        console.error('Error calling Dify AI API:', error);
        throw new Error('Failed to get response from Dify AI');
    }
}

export async function buildConversation_Dify(topic: string): Promise<any> {
    const text = "Write for me a post about " + topic;
    const accessToken = await getDifyToken();
    const response = await fetch('http://dev.dify-api.nimspace.com/api/chat-messages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            response_mode: "blocking",
            conversation_id: "",
            files: [],
            query: text,
            inputs: {
                chat_history: ""
            },
            parent_message_id: null
        }),
    }
    );
    const data = await response.json();
    console.log("response:", data);
    const info = {
        text: data.answer,
        conversationId: data.conversation_id,
        messageId: data.message_id
    };
    // tweet.conversationId_Dify = data.conversation_id;
    // tweet.messageId_Dify = data.message_id;
    return info;
}